import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertGameRoomSchema, insertGameParticipantSchema, insertChatMessageSchema } from "@shared/schema";
import { gameEngine } from "./services/game-engine";
import { aiService } from "./services/ai-service";

interface WebSocketWithUser extends WebSocket {
  userId?: string;
  roomId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const healthCheck = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      port: process.env.PORT || "5000",
      version: "1.0.0"
    };
    
    res.status(200).json(healthCheck);
  });

  // User routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, isGuest } = insertUserSchema.parse(req.body);
      
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({ username, isGuest: isGuest || false });
      }
      
      res.json({ user });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getActiveRooms();
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertGameRoomSchema.parse(req.body);
      const { hostId } = req.body;
      
      if (!hostId) {
        return res.status(400).json({ message: "Host ID is required" });
      }

      const room = await storage.createGameRoom({ ...roomData, hostId });
      
      // Add host as participant
      await storage.addParticipant({
        roomId: room.id,
        userId: hostId,
        playerType: "human",
        isSpectator: false
      });

      res.json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getGameRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const participants = await storage.getParticipantsByRoom(room.id);
      const gameState = await storage.getGameState(room.id);
      
      console.log(`[API] Room ${req.params.id} status: ${room.status}, gameState exists: ${!!gameState}`);
      
      res.json({ room, participants, gameState });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms/:id/join", async (req, res) => {
    try {
      const { userId, isSpectator } = req.body;
      const roomId = req.params.id;
      
      const room = await storage.getGameRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const participants = await storage.getParticipantsByRoom(roomId);
      const activePlayers = participants.filter(p => !p.isSpectator);
      
      if (!isSpectator && activePlayers.length >= room.maxPlayers) {
        return res.status(400).json({ message: "Room is full" });
      }

      const participant = await storage.addParticipant({
        roomId,
        userId,
        playerType: "human",
        isSpectator: isSpectator || false
      });

      res.json(participant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Chat routes
  app.get("/api/rooms/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocketWithUser) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WebSocket] Received message:`, message.type, message);
        
        switch (message.type) {
          case 'join_room':
            ws.userId = message.userId;
            ws.roomId = message.roomId;
            
            // Check if room is already playing and send current game state
            const room = await storage.getGameRoom(message.roomId);
            if (room && room.status === 'playing') {
              const gameState = await storage.getGameState(message.roomId);
              if (gameState) {
                console.log(`[WebSocket] Sending current game state to user ${message.userId} joining active game`);
                ws.send(JSON.stringify({
                  type: 'game_started',
                  gameData: gameState.gameData
                }));
              }
            }
            
            // Broadcast user joined
            broadcastToRoom(ws.roomId!, {
              type: 'user_joined',
              userId: message.userId,
              timestamp: new Date().toISOString()
            });
            break;

          case 'leave_room':
            if (ws.roomId) {
              broadcastToRoom(ws.roomId, {
                type: 'user_left',
                userId: ws.userId,
                timestamp: new Date().toISOString()
              });
            }
            ws.roomId = undefined;
            break;

          case 'chat_message':
            if (ws.roomId && ws.userId) {
              const chatMessage = await storage.addChatMessage({
                roomId: ws.roomId,
                userId: ws.userId,
                message: message.message
              });

              broadcastToRoom(ws.roomId, {
                type: 'chat_message',
                message: chatMessage
              });
            }
            break;

          case 'game_action':
            if (ws.roomId && ws.userId) {
              const room = await storage.getGameRoom(ws.roomId);
              const participants = await storage.getParticipantsByRoom(ws.roomId);
              const currentParticipant = participants.find(p => p.userId === ws.userId);
              
              if (room && currentParticipant) {
                if (message.action === 'forfeit') {
                  // End game with forfeit
                  await storage.updateGameRoom(ws.roomId, { status: "finished" });
                  
                  broadcastToRoom(ws.roomId, {
                    type: 'game_ended',
                    reason: `Player forfeited the game`,
                    winner: participants.find(p => p.id !== currentParticipant.id && !p.isSpectator)?.userId
                  });
                  
                } else if (message.action === 'draw_offer') {
                  // Broadcast draw offer to other players
                  broadcastToRoom(ws.roomId, {
                    type: 'draw_offer',
                    fromPlayer: currentParticipant.userId,
                    message: `Player offers a draw`
                  });
                }
              }
            }
            break;

          case 'ready_toggle':
            if (ws.roomId && ws.userId) {
              const participants = await storage.getParticipantsByRoom(ws.roomId);
              const participant = participants.find(p => p.userId === ws.userId);
              
              if (participant) {
                await storage.updateParticipant(participant.id, {
                  isReady: !participant.isReady
                });

                broadcastToRoom(ws.roomId, {
                  type: 'participant_updated',
                  participantId: participant.id,
                  isReady: !participant.isReady
                });
              }
            }
            break;

          case 'start_game':
            if (ws.roomId && ws.userId) {
              console.log(`[WebSocket] start_game received from user ${ws.userId} in room ${ws.roomId}`);
              const room = await storage.getGameRoom(ws.roomId);
              if (room && room.hostId === ws.userId) {
                const participants = await storage.getParticipantsByRoom(ws.roomId);
                const activePlayers = participants.filter(p => !p.isSpectator);
                const readyPlayers = activePlayers.filter(p => p.isReady);
                const allReady = activePlayers.every(p => p.isReady);
                
                console.log(`[WebSocket] Players: ${activePlayers.length}, Ready: ${readyPlayers.length}, All Ready: ${allReady}`);
                
                if (allReady) {
                  console.log(`[WebSocket] Starting game of type: ${room.gameType}`);
                  // Initialize game state
                  const initialGameData = gameEngine.initializeGame(room.gameType as any, participants);
                  console.log(`[WebSocket] Game data initialized:`, JSON.stringify(initialGameData, null, 2));
                  
                  // Set currentTurn to first non-spectator participant ID
                  const nonSpectatorParticipants = participants.filter(p => !p.isSpectator);
                  const currentTurnParticipantId = nonSpectatorParticipants[initialGameData.turn || 0]?.id;
                  
                  initialGameData.currentTurn = currentTurnParticipantId;
                  initialGameData.playerColors = {};
                  
                  // Assign player colors based on game type
                  if (room.gameType === 'chess') {
                    initialGameData.playerColors[nonSpectatorParticipants[0]?.id] = 'white';
                    initialGameData.playerColors[nonSpectatorParticipants[1]?.id] = 'black';
                  } else if (room.gameType === 'checkers') {
                    initialGameData.playerColors[nonSpectatorParticipants[0]?.id] = 'red';
                    initialGameData.playerColors[nonSpectatorParticipants[1]?.id] = 'black';
                  }
                  
                  await storage.createGameState({
                    roomId: ws.roomId,
                    gameData: initialGameData,
                    currentTurn: currentTurnParticipantId
                  });

                  await storage.updateGameRoom(ws.roomId, { status: "playing" });

                  const gameStartMessage = {
                    type: 'game_started',
                    gameData: initialGameData
                  };
                  
                  console.log(`[WebSocket] Broadcasting game_started to room ${ws.roomId}`);
                  broadcastToRoom(ws.roomId, gameStartMessage);
                } else {
                  console.log(`[WebSocket] Cannot start game - not all players ready. Active: ${activePlayers.length}, Ready: ${readyPlayers.length}`);
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Not all players are ready'
                  }));
                }
              } else {
                console.log(`[WebSocket] Cannot start game - not host or room not found`);
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Only the host can start the game'
                }));
              }
            }
            break;

          case 'game_move':
            if (ws.roomId && ws.userId) {
              const gameState = await storage.getGameState(ws.roomId);
              const room = await storage.getGameRoom(ws.roomId);
              
              if (gameState && room) {
                const participants = await storage.getParticipantsByRoom(ws.roomId);
                const currentParticipant = participants.find(p => p.userId === ws.userId);
                
                if (currentParticipant && gameState.currentTurn === currentParticipant.id) {
                  const newGameData = gameEngine.processMove(
                    room.gameType as any,
                    gameState.gameData as any,
                    message.move,
                    currentParticipant.id,
                    participants
                  );
                  
                  await storage.updateGameState(ws.roomId, {
                    gameData: newGameData,
                    currentTurn: newGameData.currentTurn,
                    turnNumber: gameState.turnNumber! + 1
                  });

                  broadcastToRoom(ws.roomId, {
                    type: 'game_updated',
                    gameData: newGameData,
                    currentTurn: newGameData.currentTurn,
                    move: message.move
                  });

                  // Handle bot turns
                  if (newGameData.currentTurn) {
                    const nextParticipant = participants.find(p => p.id === newGameData.currentTurn);
                    if (nextParticipant?.playerType === 'bot') {
                      setTimeout(async () => {
                        const botMove = await aiService.getBotMove(room.gameType as any, newGameData, (nextParticipant.botDifficulty as any) || 'medium');

                        if (botMove) {
                          const botGameData = gameEngine.processMove(
                            room.gameType as any,
                            newGameData,
                            botMove,
                            nextParticipant.id,
                            participants
                          );

                          await storage.updateGameState(ws.roomId!, {
                            gameData: botGameData,
                            currentTurn: botGameData.currentTurn,
                            turnNumber: gameState.turnNumber! + 2
                          });

                          broadcastToRoom(ws.roomId!, {
                            type: 'game_updated',
                            gameData: botGameData,
                            currentTurn: botGameData.currentTurn,
                            move: botMove
                          });
                        }
                      }, 1000 + Math.random() * 2000); // 1-3 second delay for bot move
                    }
                  }
                }
              }
            }
            break;
        }
      } catch (error: any) {
        console.error('WebSocket message error:', error);
        console.error('Raw message data:', data.toString());
        ws.send(JSON.stringify({
          type: 'error',
          message: `Invalid message format: ${error.message}`
        }));
      }
    });

    ws.on('close', () => {
      if (ws.roomId) {
        broadcastToRoom(ws.roomId, {
          type: 'user_left',
          userId: ws.userId,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  function broadcastToRoom(roomId: string, message: any) {
    wss.clients.forEach((client: WebSocketWithUser) => {
      if (client.roomId === roomId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
