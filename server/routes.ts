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
  // User routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, isGuest } = insertUserSchema.parse(req.body);
      
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({ username, isGuest: isGuest || false });
      }
      
      res.json(user);
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
        
        switch (message.type) {
          case 'join_room':
            ws.userId = message.userId;
            ws.roomId = message.roomId;
            
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
              const room = await storage.getGameRoom(ws.roomId);
              if (room && room.hostId === ws.userId) {
                const participants = await storage.getParticipantsByRoom(ws.roomId);
                const allReady = participants.filter(p => !p.isSpectator).every(p => p.isReady);
                
                if (allReady) {
                  // Initialize game state
                  const initialGameData = gameEngine.initializeGame(room.gameType as GameType, participants);
                  
                  await storage.createGameState({
                    roomId: ws.roomId,
                    gameData: initialGameData,
                    currentTurn: participants.find(p => !p.isSpectator)?.id
                  });

                  await storage.updateGameRoom(ws.roomId, { status: "playing" });

                  broadcastToRoom(ws.roomId, {
                    type: 'game_started',
                    gameData: initialGameData
                  });
                }
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
                    room.gameType as GameType,
                    gameState.gameData,
                    message.move,
                    currentParticipant.id
                  );

                  const nextTurn = gameEngine.getNextTurn(room.gameType as GameType, participants, currentParticipant.id);
                  
                  await storage.updateGameState(ws.roomId, {
                    gameData: newGameData,
                    currentTurn: nextTurn,
                    turnNumber: gameState.turnNumber! + 1
                  });

                  broadcastToRoom(ws.roomId, {
                    type: 'game_updated',
                    gameData: newGameData,
                    currentTurn: nextTurn,
                    move: message.move
                  });

                  // Handle bot turns
                  if (nextTurn) {
                    const nextParticipant = participants.find(p => p.id === nextTurn);
                    if (nextParticipant?.playerType === 'bot') {
                      setTimeout(async () => {
                        const botMove = await aiService.getBotMove(
                          room.gameType as GameType,
                          newGameData,
                          nextParticipant.botDifficulty || 'medium'
                        );

                        if (botMove) {
                          const botGameData = gameEngine.processMove(
                            room.gameType as GameType,
                            newGameData,
                            botMove,
                            nextParticipant.id
                          );

                          const nextAfterBot = gameEngine.getNextTurn(room.gameType as GameType, participants, nextParticipant.id);
                          
                          await storage.updateGameState(ws.roomId!, {
                            gameData: botGameData,
                            currentTurn: nextAfterBot,
                            turnNumber: gameState.turnNumber! + 2
                          });

                          broadcastToRoom(ws.roomId!, {
                            type: 'game_updated',
                            gameData: botGameData,
                            currentTurn: nextAfterBot,
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
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
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
