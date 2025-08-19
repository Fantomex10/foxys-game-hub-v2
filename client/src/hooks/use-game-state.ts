import { useState, useEffect } from "react";
import type { GameState } from "@shared/schema";

export interface GameMove {
  type: string;
  data: any;
}

export function useGameState(socket: WebSocket | null, initialGameState?: GameState | null) {
  const [gameState, setGameState] = useState<any>(initialGameState?.gameData || null);
  const [currentTurn, setCurrentTurn] = useState<string | undefined>(initialGameState?.currentTurn || undefined);
  const [turnNumber, setTurnNumber] = useState<number>(initialGameState?.turnNumber || 1);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'game_started':
            setGameState(message.gameData);
            setCurrentTurn(message.currentTurn);
            setTurnNumber(1);
            break;
            
          case 'game_updated':
            setGameState(message.gameData);
            setCurrentTurn(message.currentTurn);
            setTurnNumber(prev => prev + 1);
            break;
            
          case 'game_ended':
            setGameState(message.gameData);
            setCurrentTurn(undefined);
            break;
            
          case 'turn_timeout':
            // Handle turn timeout
            console.log("Turn timeout for player:", message.playerId);
            break;
            
          case 'invalid_move':
            console.error("Invalid move:", message.reason);
            break;
        }
      } catch (error) {
        console.error("Failed to parse game message:", error);
      }
    };

    socket.addEventListener('message', handleMessage);
    
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket]);

  // Update isMyTurn based on current turn and user
  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser && currentTurn) {
      const user = JSON.parse(currentUser);
      // This would need to be matched with participant ID, not user ID
      // For now, this is a simplified check
      setIsMyTurn(currentTurn === user.id);
    }
  }, [currentTurn]);

  const makeMove = (move: GameMove) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot make move: WebSocket not connected");
      return false;
    }

    if (!isMyTurn) {
      console.warn("Cannot make move: Not your turn");
      return false;
    }

    socket.send(JSON.stringify({
      type: 'game_move',
      move
    }));
    
    return true;
  };

  const forfeitGame = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot forfeit: WebSocket not connected");
      return false;
    }

    socket.send(JSON.stringify({
      type: 'forfeit_game'
    }));
    
    return true;
  };

  const requestDraw = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot request draw: WebSocket not connected");
      return false;
    }

    socket.send(JSON.stringify({
      type: 'request_draw'
    }));
    
    return true;
  };

  return {
    gameState,
    currentTurn,
    turnNumber,
    isMyTurn,
    makeMove,
    forfeitGame,
    requestDraw,
  };
}
