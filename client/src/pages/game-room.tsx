import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings } from "lucide-react";
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
  const [gameState, setGameState] = useState<any>(null);
  const [selectedSquare, setSelectedSquare] = useState<{row: number, col: number} | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<{row: number, col: number, piece: string} | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<{row: number, col: number} | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join the room
      ws.send(JSON.stringify({
        type: 'join_room',
        userId: user.id,
        roomId: roomId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'game_started':
          case 'game_updated':
            setGameState(message.gameData);
            if (message.type === 'game_started') {
              toast({
                title: 'Game Started!',
                description: 'The game has begun. Make your move!'
              });
            }
            break;
            
          case 'error':
            toast({
              title: 'Game Error',
              description: message.message || 'An error occurred in the game',
              variant: 'destructive'
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
      toast({
        title: 'Connection Error',
        description: 'Lost connection to the game server. Please refresh the page.',
        variant: 'destructive'
      });
    };

    return () => {
      ws.close();
    };
  }, [user, roomId, toast]);

  const makeMove = (move: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'game_move',
        move: move
      }));
    } else {
      toast({
        title: 'Connection Error',
        description: 'Cannot make move - not connected to game server',
        variant: 'destructive'
      });
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
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Game Starting...</h3>
              <p className="text-gray-400">Please wait while the game initializes.</p>
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

  const isPlayerPiece = (piece: string) => {
    if (!gameState || !roomData) return false;
    const currentParticipant = roomData.participants.find((p: any) => p.userId === user?.id);
    if (!currentParticipant) return false;
    
    const playerIndex = roomData.participants.filter((p: any) => !p.isSpectator).findIndex((p: any) => p.id === currentParticipant.id);
    const isWhitePlayer = playerIndex === 0;
    
    return isWhitePlayer ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
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
    if (!gameState || !roomData) return false;
    const currentParticipant = roomData.participants.find((p: any) => p.userId === user?.id);
    if (!currentParticipant) return false;
    
    const playerIndex = roomData.participants.filter((p: any) => !p.isSpectator).findIndex((p: any) => p.id === currentParticipant.id);
    const isRedPlayer = playerIndex === 0;
    
    return isRedPlayer ? piece.toLowerCase() === 'r' : piece.toLowerCase() === 'b';
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
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const touchDraggedPiece = useRef<{row: number, col: number, piece: string} | null>(null);

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
                onClick={() => setLocation(`/lobby/${roomId}`)}
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
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
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
                      {gameState ? (isCurrentPlayerTurn() ? 'Your Turn' : 'Opponent\'s Turn') : 'Loading...'}
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
                    variant="outline" 
                    size="sm" 
                    className="w-full text-gray-300 border-gray-600 hover:bg-gray-600/20"
                    data-testid="button-forfeit"
                  >
                    Forfeit Game
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-gray-300 border-gray-600 hover:bg-gray-600/20"
                    data-testid="button-request-draw"
                  >
                    Request Draw
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
