import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings, Send } from "lucide-react";
import type { User } from "@shared/schema";

export default function GameRoom() {
  const [match, params] = useRoute("/game/:roomId");
  const roomId = params?.roomId;
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);

  const { data: roomData, isLoading } = useQuery<{room: any, participants: any[], gameState?: any}>({
    queryKey: ['/api/rooms', roomId],
    enabled: !!roomId,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const maxReconnectAttempts = 5;
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [moveInProgress, setMoveInProgress] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<{row: number, col: number} | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<{row: number, col: number, piece: string} | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<{row: number, col: number} | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const touchDraggedPiece = useRef<{row: number, col: number, piece: string} | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    if (!userId || !username) {
      setLocation("/");
      return;
    }
    setUser({ id: userId, username, isGuest: true, createdAt: new Date() });
  }, [setLocation]);

  // WebSocket connection for game state
  useEffect(() => {
    if (!user || !roomId) return;

    const ws = connectWebSocket();
    
    return () => {
      setIsReconnecting(false);
      setReconnectAttempts(0);
      
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
        reconnectInterval.current = null;
      }
      
      if (ws) {
        ws.close(1000, 'Component unmounting'); // Clean close
      }
    };
  }, [user, roomId, toast]);

  // Load existing game state if room is already playing
  useEffect(() => {
    if (roomData?.room?.status === 'playing' && roomData?.gameState && !gameState) {
      console.log('Loading existing game state from room data:', roomData.gameState);
      setGameState(roomData.gameState.gameData);
    }
  }, [roomData, gameState]);

  // Handle connection state changes
  useEffect(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      toast({
        title: 'Connection Failed',
        description: 'Unable to reconnect to game server. Please refresh the page.',
        variant: 'destructive'
      });
    }
  }, [reconnectAttempts, maxReconnectAttempts, toast]);

  const connectWebSocket = () => {
    if (!user || !roomId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      
      // Clear any pending reconnection attempts
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
        reconnectInterval.current = null;
      }
      
      // Join the room
      ws.send(JSON.stringify({
        type: 'join_room',
        userId: user.id,
        roomId: roomId
      }));
      
      toast({
        title: '🟢 Connected',
        description: 'Successfully connected to game server',
        className: 'toast-success'
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'game_started':
          case 'game_updated':
            console.log('Received game state message:', message.type, message.gameData);
            setGameState(message.gameData);
            setMoveInProgress(false); // Reset move state on game update
            setLastError(null);
            
            if (message.type === 'game_started') {
              setIsGameLoading(false);
              toast({
                title: '🎮 Game Started!',
                description: 'The game has begun. Make your move!',
                className: 'toast-success'
              });
            } else {
              toast({
                title: '✅ Move Completed',
                description: 'Your move has been processed',
                className: 'toast-success'
              });
            }
            break;
            
          case 'chat_message':
            // Forward to chat component by adding to messages if needed
            console.log('Chat message received:', message);
            break;
            
          case 'game_ended':
            toast({
              title: 'Game Over',
              description: message.reason || 'The game has ended'
            });
            break;
            
          case 'draw_offer':
            toast({
              title: 'Draw Offer',
              description: message.message || 'Your opponent offers a draw'
            });
            break;
            
          case 'error':
            const errorMsg = message.message || 'An error occurred in the game';
            setLastError(errorMsg);
            setMoveInProgress(false);
            setIsGameLoading(false);
            
            toast({
              title: '❌ Game Error',
              description: errorMsg,
              variant: 'destructive',
              className: 'toast-error'
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setIsConnected(false);
      
      // Don't attempt to reconnect if it was a clean close or if we're already reconnecting
      if (event.code === 1000 || isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
        return;
      }
      
      attemptReconnect();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      
      if (!isReconnecting && reconnectAttempts < maxReconnectAttempts) {
        attemptReconnect();
      }
    };

    return ws;
  };

  const attemptReconnect = () => {
    if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    setIsReconnecting(true);
    const newAttemptCount = reconnectAttempts + 1;
    setReconnectAttempts(newAttemptCount);

    const backoffDelay = Math.min(1000 * Math.pow(2, newAttemptCount - 1), 30000); // Exponential backoff, max 30s

    console.log(`Attempting to reconnect (${newAttemptCount}/${maxReconnectAttempts}) in ${backoffDelay}ms`);
    
    toast({
      title: '🔄 Reconnecting...',
      description: `Attempt ${newAttemptCount} of ${maxReconnectAttempts}`,
      variant: 'default',
      className: 'toast-info'
    });

    reconnectInterval.current = setTimeout(() => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      connectWebSocket();
    }, backoffDelay);
  };

  const forceReconnect = () => {
    setReconnectAttempts(0);
    setIsReconnecting(false);
    
    if (reconnectInterval.current) {
      clearTimeout(reconnectInterval.current);
      reconnectInterval.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    connectWebSocket();
  };

  const makeMove = (move: any) => {
    if (moveInProgress) {
      toast({
        title: 'Move in Progress',
        description: 'Please wait for the current move to complete',
        variant: 'default'
      });
      return;
    }

    setMoveInProgress(true);
    setLastError(null);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending move:', move);
      wsRef.current.send(JSON.stringify({
        type: 'game_move',
        move: move
      }));
      
      // Set timeout to reset move state if no response
      setTimeout(() => {
        setMoveInProgress(false);
      }, 5000);
    } else {
      setMoveInProgress(false);
      const errorMsg = 'Connection lost while making move';
      setLastError(errorMsg);
      
      toast({
        title: '🔴 Connection Lost',
        description: 'Reconnecting to game server...',
        variant: 'destructive',
        className: 'toast-error'
      });
      
      // Force reconnect and queue the move for retry
      forceReconnect();
      
      // Queue move to retry after successful reconnection
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('Retrying move after reconnection:', move);
          setMoveInProgress(true);
          wsRef.current.send(JSON.stringify({
            type: 'game_move',
            move: move
          }));
          
          setTimeout(() => setMoveInProgress(false), 5000);
        }
      }, 2000); // Wait 2 seconds for reconnection
    }
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Game Not Found</h2>
          <p className="text-gray-400 mb-4">The game you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/hub")} className="game-button">
            Back to Hub
          </Button>
        </div>
      </div>
    );
  }

  const { room, participants = [] } = roomData;

  const renderGameBoard = () => {
    if (!gameState) {
      return (
        <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
          <CardContent className="p-8">
            <div className="text-center" data-testid="game-initializing">
              <div className="flex flex-col items-center space-y-4">
                <div className="loading-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
                <h3 className="text-xl font-semibold text-white loading-pulse">Game Starting...</h3>
                <p className="text-gray-400">Please wait while the game initializes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Render different game boards based on game type
    switch (room.gameType) {
      case 'chess':
        return renderChessBoard();
      case 'hearts':
        return renderCardGame();
      case 'checkers':
        return renderCheckersBoard();
      default:
        return renderGenericGameBoard();
    }
  };

  const renderChessBoard = () => {
    return (
      <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
        <CardContent className="p-6">
          <div className="aspect-square max-w-lg mx-auto">
            <div className="grid grid-cols-8 gap-0 border-2 border-gray-600 rounded-lg overflow-hidden">
              {gameState?.board?.map((row: any[], rowIndex: number) =>
                row.map((piece: any, colIndex: number) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`aspect-square flex items-center justify-center text-2xl cursor-pointer hover:bg-game-blue/20 transition-colors ${
                      (rowIndex + colIndex) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-800'
                    } ${
                      selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex ? 'ring-4 ring-blue-500' : ''
                    } ${
                      dragOverSquare?.row === rowIndex && dragOverSquare?.col === colIndex ? 'ring-4 ring-green-500 bg-green-200/30' : ''
                    }`}
                    onClick={() => handleChessSquareClick(rowIndex, colIndex)}
                    onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    onDragLeave={() => setDragOverSquare(null)}
                    data-testid={`chess-square-${rowIndex}-${colIndex}`}
                  >
                    {piece && (
                      <span 
                        className={`${piece === piece?.toUpperCase() ? 'text-white' : 'text-black'} select-none ${
                          draggedPiece?.row === rowIndex && draggedPiece?.col === colIndex ? 'opacity-50' : ''
                        }`}
                        draggable={piece && isPlayerPiece(piece) && isCurrentPlayerTurn()}
                        onDragStart={(e) => handleDragStart(e, rowIndex, colIndex, piece)}
                        onDragEnd={() => handleDragEnd()}
                        onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex, piece)}
                        onTouchMove={(e) => handleTouchMove(e)}
                        onTouchEnd={(e) => handleTouchEnd(e)}
                        style={{ cursor: piece && isPlayerPiece(piece) && isCurrentPlayerTurn() ? 'grab' : 'default' }}
                      >
                        {getChessPieceSymbol(piece)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCardGame = () => {
    const currentParticipant = participants.find((p: any) => p.userId === user?.id);
    const hand = gameState?.hands?.[currentParticipant?.id] || [];

    return (
      <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Game Area */}
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold text-white mb-4">Card Game in Progress</h3>
              <div className="flex justify-center space-x-2">
                {gameState?.trick?.map((card: any, index: number) => (
                  <div
                    key={index}
                    className="w-16 h-24 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center text-black"
                    data-testid={`played-card-${index}`}
                  >
                    {card.card}
                  </div>
                ))}
              </div>
            </div>

            {/* Player's Hand */}
            <div>
              <h4 className="text-white font-semibold mb-2">Your Hand</h4>
              <div className="flex flex-wrap gap-2">
                {hand.map((card: string, index: number) => (
                  <div
                    key={index}
                    className="w-16 h-24 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center text-black cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleCardPlay(card)}
                    data-testid={`hand-card-${index}`}
                  >
                    {card}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCheckersBoard = () => {
    return (
      <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
        <CardContent className="p-6">
          <div className="aspect-square max-w-lg mx-auto">
            <div className="grid grid-cols-8 gap-0 border-2 border-gray-600 rounded-lg overflow-hidden">
              {gameState?.board?.map((row: any[], rowIndex: number) =>
                row.map((piece: any, colIndex: number) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`aspect-square flex items-center justify-center cursor-pointer hover:bg-game-blue/20 transition-colors ${
                      (rowIndex + colIndex) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-800'
                    } ${
                      selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex ? 'ring-4 ring-blue-500' : ''
                    } ${
                      dragOverSquare?.row === rowIndex && dragOverSquare?.col === colIndex ? 'ring-4 ring-green-500 bg-green-200/30' : ''
                    }`}
                    onClick={() => handleCheckersSquareClick(rowIndex, colIndex)}
                    onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    onDragLeave={() => setDragOverSquare(null)}
                    data-testid={`checkers-square-${rowIndex}-${colIndex}`}
                  >
                    {piece && (
                      <div
                        className={`w-8 h-8 rounded-full border-2 select-none ${
                          piece.toLowerCase() === 'r'
                            ? 'bg-red-600 border-red-800'
                            : 'bg-black border-gray-800'
                        } ${
                          draggedPiece?.row === rowIndex && draggedPiece?.col === colIndex ? 'opacity-50' : ''
                        }`}
                        draggable={piece && isCheckersPlayerPiece(piece) && isCurrentPlayerTurn()}
                        onDragStart={(e) => handleDragStart(e, rowIndex, colIndex, piece)}
                        onDragEnd={() => handleDragEnd()}
                        onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex, piece)}
                        onTouchMove={(e) => handleTouchMove(e)}
                        onTouchEnd={(e) => handleTouchEnd(e)}
                        style={{ cursor: piece && isCheckersPlayerPiece(piece) && isCurrentPlayerTurn() ? 'grab' : 'default' }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGenericGameBoard = () => {
    return (
      <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
        <CardContent className="p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-4">
              {room.gameType.charAt(0).toUpperCase() + room.gameType.slice(1)} Game
            </h3>
            <p className="text-gray-400 mb-6">Game interface for {room.gameType} coming soon!</p>
            <div className="bg-game-slate/50 rounded-lg p-6">
              <pre className="text-sm text-gray-300 text-left overflow-auto">
                {JSON.stringify(gameState, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleChessSquareClick = (row: number, col: number) => {
    if (!gameState || !isCurrentPlayerTurn()) return;

    const piece = gameState.board[row][col];
    
    if (!selectedSquare) {
      // Select a piece if it belongs to current player
      if (piece && isPlayerPiece(piece)) {
        setSelectedSquare({ row, col });
      }
    } else {
      // Try to move the selected piece
      if (selectedSquare.row === row && selectedSquare.col === col) {
        // Deselect if clicking same square
        setSelectedSquare(null);
      } else {
        // Attempt move
        makeMove({
          type: 'chess_move',
          from: { row: selectedSquare.row, col: selectedSquare.col },
          to: { row, col }
        });
        setSelectedSquare(null);
      }
    }
  };

  const getPlayerColor = () => {
    if (!gameState || !roomData || !user) return null;
    const currentParticipant = roomData.participants.find((p: any) => p.userId === user.id);
    if (!currentParticipant || !gameState.playerColors) return null;
    return gameState.playerColors[currentParticipant.id];
  };

  const isPlayerPiece = (piece: string) => {
    const playerColor = getPlayerColor();
    if (!playerColor) return false;
    
    if (room.gameType === 'chess') {
      return playerColor === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
    } else if (room.gameType === 'checkers') {
      return playerColor === 'red' ? piece === 'r' || piece === 'R' : piece === 'b' || piece === 'B';
    }
    return false;
  };

  const isCurrentPlayerTurn = () => {
    if (!gameState || !roomData) return false;
    const currentParticipant = roomData.participants.find((p: any) => p.userId === user?.id);
    return currentParticipant && gameState.currentTurn === currentParticipant.id;
  };

  const handleCardPlay = (card: string) => {
    makeMove({
      type: 'play_card',
      data: { card }
    });
  };

  const handleCheckersSquareClick = (row: number, col: number) => {
    if (!gameState || !isCurrentPlayerTurn()) return;

    const piece = gameState.board[row][col];
    
    if (!selectedSquare) {
      // Select a piece if it belongs to current player
      if (piece && isCheckersPlayerPiece(piece)) {
        setSelectedSquare({ row, col });
      }
    } else {
      // Try to move the selected piece
      if (selectedSquare.row === row && selectedSquare.col === col) {
        // Deselect if clicking same square
        setSelectedSquare(null);
      } else {
        // Attempt move
        makeMove({
          type: 'checkers_move',
          from: { row: selectedSquare.row, col: selectedSquare.col },
          to: { row, col }
        });
        setSelectedSquare(null);
      }
    }
  };

  const isCheckersPlayerPiece = (piece: string) => {
    return isPlayerPiece(piece);
  };

  const handleForfeit = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_action',
        action: 'forfeit'
      }));
    }
  };

  const handleDrawOffer = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_action',
        action: 'draw_offer'
      }));
    }
  };

  const handleSendMessage = (message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      console.log('Sending chat message:', message);
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: message,
        userId: user.id,
        username: user.username
      }));
    } else {
      toast({
        title: 'Connection Error',
        description: 'Cannot send message - not connected to server',
        variant: 'destructive'
      });
      // Try to force reconnect
      forceReconnect();
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, row: number, col: number, piece: string) => {
    if (!isCurrentPlayerTurn()) {
      e.preventDefault();
      return;
    }
    
    setDraggedPiece({ row, col, piece });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${row},${col}`);
    
    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(5deg)';
    e.dataTransfer.setDragImage(dragImage, 20, 20);
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSquare({ row, col });
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverSquare(null);
    
    if (!draggedPiece) return;
    
    const { row: fromRow, col: fromCol } = draggedPiece;
    
    if (fromRow === row && fromCol === col) {
      setDraggedPiece(null);
      return;
    }
    
    // Determine move type based on game
    const moveType = roomData?.room?.gameType === 'chess' ? 'chess_move' : 'checkers_move';
    
    makeMove({
      type: moveType,
      from: { row: fromRow, col: fromCol },
      to: { row, col }
    });
    
    setDraggedPiece(null);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setDragOverSquare(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number, piece: string) => {
    if (!isCurrentPlayerTurn()) return;
    
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchDraggedPiece.current = { row, col, piece };
    
    // Prevent default to avoid scrolling
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDraggedPiece.current || !touchStartPos.current) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // Start drag if moved enough
    if (deltaX > 10 || deltaY > 10) {
      setDraggedPiece(touchDraggedPiece.current);
      
      // Find the square under the touch
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const square = element?.closest('[data-testid*=\"square\"]');
      if (square) {
        const testId = square.getAttribute('data-testid');
        const match = testId?.match(/(\\d+)-(\\d+)/);
        if (match) {
          const row = parseInt(match[1]);
          const col = parseInt(match[2]);
          setDragOverSquare({ row, col });
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDraggedPiece.current) return;
    
    e.preventDefault();
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const square = element?.closest('[data-testid*=\"square\"]');
    
    if (square && draggedPiece) {
      const testId = square.getAttribute('data-testid');
      const match = testId?.match(/(\\d+)-(\\d+)/);
      if (match) {
        const row = parseInt(match[1]);
        const col = parseInt(match[2]);
        
        const { row: fromRow, col: fromCol } = touchDraggedPiece.current;
        
        if (fromRow !== row || fromCol !== col) {
          // Determine move type based on game
          const moveType = roomData?.room?.gameType === 'chess' ? 'chess_move' : 'checkers_move';
          
          makeMove({
            type: moveType,
            from: { row: fromRow, col: fromCol },
            to: { row, col }
          });
        }
      }
    }
    
    // Reset touch state
    touchStartPos.current = null;
    touchDraggedPiece.current = null;
    setDraggedPiece(null);
    setDragOverSquare(null);
  };

  const getChessPieceSymbol = (piece: string) => {
    const symbols: Record<string, string> = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    return symbols[piece] || piece;
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-gray-700/50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/hub')}
                className="text-gray-400 hover:text-white"
                data-testid="button-back-to-lobby"
              >
                <ArrowLeft size={20} />
              </Button>
              <h1 className="text-xl font-bold text-white" data-testid="text-game-title">
                {room.name} - {room.gameType.charAt(0).toUpperCase() + room.gameType.slice(1)}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2`} data-testid="game-connection-status">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 
                  isReconnecting ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`}></div>
                <span className={`text-sm ${
                  isConnected ? 'text-green-400' : 
                  isReconnecting ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {isConnected ? 'Connected' : 
                   isReconnecting ? `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})` :
                   reconnectAttempts >= maxReconnectAttempts ? 'Connection Failed' :
                   'Disconnected'}
                </span>
                {(!isConnected && !isReconnecting && reconnectAttempts < maxReconnectAttempts) && (
                  <Button 
                    onClick={forceReconnect} 
                    size="sm" 
                    variant="ghost" 
                    className="text-xs px-2 py-1 h-6"
                  >
                    Retry
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-game-settings">
                <Settings size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            {renderGameBoard()}
          </div>

          {/* Game Info Sidebar */}
          <div className="space-y-6">
            {/* Current Turn */}
            <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-2">Game Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300 text-sm">Turn:</span>
                    <span className="text-white text-sm" data-testid="text-current-turn">
                      {gameState ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${
                            getPlayerColor() === 'white' ? 'bg-white border border-gray-400' : 
                            getPlayerColor() === 'red' ? 'bg-red-500' : 
                            getPlayerColor() === 'black' ? 'bg-gray-800' : 'bg-gray-500'
                          }`}></span>
                          <span>You are {getPlayerColor() || 'Unknown'}</span>
                          <span className="mx-2">•</span>
                          <span>{isCurrentPlayerTurn() ? 'Your Turn' : 'Opponent\'s Turn'}</span>
                        </div>
                      ) : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300 text-sm">Phase:</span>
                    <span className="text-white text-sm" data-testid="text-game-phase">
                      {gameState?.phase || 'Starting'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players */}
            <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-4">Players</h4>
                <div className="space-y-3">
                  {participants.filter((p: any) => !p.isSpectator).map((participant: any, index: number) => (
                    <div key={participant.id} className="flex items-center space-x-3" data-testid={`player-info-${index}`}>
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {participant.userId?.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">
                          {participant.userId === user?.id ? 'You' : `Player ${index + 1}`}
                        </p>
                      </div>
                      {gameState?.currentTurn === participant.id && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Game Actions */}
            <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-4">Actions</h4>
                <div className="space-y-2">
                  <Button 
                    onClick={handleForfeit}
                    variant="outline" 
                    size="sm" 
                    className="w-full text-gray-300 border-gray-600 hover:bg-gray-600/20 transition-all duration-200 hover:scale-105"
                    data-testid="button-forfeit"
                    disabled={moveInProgress}
                  >
                    {moveInProgress ? (
                      <div className="flex items-center gap-2">
                        <div className="loading-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                        Processing...
                      </div>
                    ) : (
                      'Forfeit Game'
                    )}
                  </Button>
                  <Button 
                    onClick={handleDrawOffer}
                    variant="outline" 
                    size="sm" 
                    className="w-full text-gray-300 border-gray-600 hover:bg-gray-600/20 transition-all duration-200 hover:scale-105"
                    data-testid="button-request-draw"
                    disabled={moveInProgress}
                  >
                    {moveInProgress ? (
                      <div className="flex items-center gap-2">
                        <div className="loading-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                        Processing...
                      </div>
                    ) : (
                      'Request Draw'
                    )}
                  </Button>
                  {lastError && (
                    <div className="mt-2 p-3 bg-red-950/50 border border-red-500/50 rounded-md text-red-400 text-sm error-shake" data-testid="error-message">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">⚠️</span>
                        <span>{lastError}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            {room.enableChat && (
              <div className="bg-game-navy/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Chat</h4>
                <div className="space-y-2">
                  <div className="h-32 bg-game-slate/30 rounded p-2 overflow-y-auto text-sm text-gray-300">
                    <div className="text-blue-400">System: Welcome to the game!</div>
                    <div className="text-gray-500 text-xs">Chat functionality coming soon...</div>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-game-slate/50 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      disabled
                    />
                    <Button size="sm" disabled>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
