import type { GameType, GameParticipant } from "@shared/schema";

export interface GameMove {
  type: string;
  data: any;
}

export interface GameData {
  gameType: GameType;
  players: string[];
  board?: any;
  cards?: any;
  scores?: Record<string, number>;
  turn?: number;
  phase?: string;
  winner?: string;
  [key: string]: any;
}

class GameEngine {
  initializeGame(gameType: GameType, participants: GameParticipant[]): GameData {
    const players = participants.filter(p => !p.isSpectator).map(p => p.id);
    
    switch (gameType) {
      case 'chess':
        return this.initializeChess(players);
      case 'checkers':
        return this.initializeCheckers(players);
      case 'hearts':
        return this.initializeHearts(players);
      case 'spades':
        return this.initializeSpades(players);
      case 'crazy8s':
        return this.initializeCrazy8s(players);
      case 'gofish':
        return this.initializeGoFish(players);
      default:
        throw new Error(`Unsupported game type: ${gameType}`);
    }
  }

  processMove(gameType: GameType, gameData: GameData, move: GameMove, playerId: string, allParticipants: any[]): GameData {
    const updatedGameData = this.processGameSpecificMove(gameType, gameData, move, playerId);
    
    // Update currentTurn to next player's participant ID
    const nonSpectatorParticipants = allParticipants.filter(p => !p.isSpectator);
    const nextTurnParticipantId = nonSpectatorParticipants[updatedGameData.turn || 0]?.id;
    updatedGameData.currentTurn = nextTurnParticipantId;
    
    return updatedGameData;
  }
  
  private processGameSpecificMove(gameType: GameType, gameData: GameData, move: GameMove, playerId: string): GameData {
    switch (gameType) {
      case 'chess':
        return this.processChessMove(gameData, move, playerId);
      case 'checkers':
        return this.processCheckersMove(gameData, move, playerId);
      case 'hearts':
        return this.processHeartsMove(gameData, move, playerId);
      case 'spades':
        return this.processSpadesMove(gameData, move, playerId);
      case 'crazy8s':
        return this.processCrazy8sMove(gameData, move, playerId);
      case 'gofish':
        return this.processGoFishMove(gameData, move, playerId);
      default:
        return gameData;
    }
  }

  getNextTurn(gameType: GameType, participants: GameParticipant[], currentPlayerId: string): string | undefined {
    const players = participants.filter(p => !p.isSpectator);
    const currentIndex = players.findIndex(p => p.id === currentPlayerId);
    
    if (currentIndex === -1) return undefined;
    
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex].id;
  }

  private initializeChess(players: string[]): GameData {
    const initialBoard = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    return {
      gameType: 'chess',
      players,
      board: initialBoard,
      turn: 0, // 0 for white, 1 for black
      phase: 'playing',
      moveHistory: [],
      capturedPieces: { white: [], black: [] }
    };
  }

  private initializeCheckers(players: string[]): GameData {
    const initialBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Place pieces
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          initialBoard[row][col] = 'b'; // black pieces
        }
      }
    }
    
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          initialBoard[row][col] = 'r'; // red pieces
        }
      }
    }

    return {
      gameType: 'checkers',
      players,
      board: initialBoard,
      turn: 0,
      phase: 'playing',
      capturedPieces: { red: 0, black: 0 }
    };
  }

  private initializeHearts(players: string[]): GameData {
    const deck = this.createStandardDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    const hands: Record<string, string[]> = {};
    
    // Deal 13 cards to each player
    players.forEach((playerId, index) => {
      hands[playerId] = shuffledDeck.slice(index * 13, (index + 1) * 13);
    });

    return {
      gameType: 'hearts',
      players,
      hands,
      scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}),
      trick: [],
      trickWinner: null,
      phase: 'passing', // passing, playing, scoring
      round: 1
    };
  }

  private initializeSpades(players: string[]): GameData {
    const deck = this.createStandardDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    const hands: Record<string, string[]> = {};
    
    players.forEach((playerId, index) => {
      hands[playerId] = shuffledDeck.slice(index * 13, (index + 1) * 13);
    });

    return {
      gameType: 'spades',
      players,
      hands,
      scores: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}),
      bids: {},
      tricks: players.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}),
      phase: 'bidding',
      round: 1
    };
  }

  private initializeCrazy8s(players: string[]): GameData {
    const deck = this.createStandardDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    const hands: Record<string, string[]> = {};
    
    // Deal cards based on player count
    const cardsPerPlayer = players.length <= 2 ? 7 : 5;
    let deckIndex = 0;
    
    players.forEach(playerId => {
      hands[playerId] = shuffledDeck.slice(deckIndex, deckIndex + cardsPerPlayer);
      deckIndex += cardsPerPlayer;
    });

    const drawPile = shuffledDeck.slice(deckIndex + 1);
    const discardPile = [shuffledDeck[deckIndex]];

    return {
      gameType: 'crazy8s',
      players,
      hands,
      drawPile,
      discardPile,
      currentSuit: null,
      phase: 'playing',
      direction: 1
    };
  }

  private initializeGoFish(players: string[]): GameData {
    const deck = this.createStandardDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    const hands: Record<string, string[]> = {};
    
    // Deal cards
    const cardsPerPlayer = players.length <= 4 ? 7 : 5;
    let deckIndex = 0;
    
    players.forEach(playerId => {
      hands[playerId] = shuffledDeck.slice(deckIndex, deckIndex + cardsPerPlayer);
      deckIndex += cardsPerPlayer;
    });

    return {
      gameType: 'gofish',
      players,
      hands,
      drawPile: shuffledDeck.slice(deckIndex),
      books: players.reduce((acc, p) => ({ ...acc, [p]: [] }), {}),
      phase: 'playing'
    };
  }

  private processChessMove(gameData: GameData, move: GameMove, playerId: string): GameData {
    // Basic chess move processing - would need full chess logic
    const newBoard = JSON.parse(JSON.stringify(gameData.board));
    const { from, to } = move.data;
    
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    
    return {
      ...gameData,
      board: newBoard,
      turn: 1 - gameData.turn!,
      moveHistory: [...(gameData.moveHistory || []), move]
    };
  }

  private processCheckersMove(gameData: GameData, move: GameMove, playerId: string): GameData {
    // Basic checkers move processing
    const newBoard = JSON.parse(JSON.stringify(gameData.board));
    const { from, to, captures } = move.data;
    
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    
    // Handle captures
    if (captures && captures.length > 0) {
      captures.forEach((capture: {row: number, col: number}) => {
        newBoard[capture.row][capture.col] = null;
      });
    }
    
    return {
      ...gameData,
      board: newBoard,
      turn: 1 - gameData.turn!
    };
  }

  private processHeartsMove(gameData: GameData, move: GameMove, playerId: string): GameData {
    // Hearts card play logic
    const newHands = { ...gameData.hands };
    const { card } = move.data;
    
    // Remove card from player's hand
    newHands[playerId] = newHands[playerId].filter((c: string) => c !== card);
    
    const newTrick = [...(gameData.trick || []), { playerId, card }];
    
    return {
      ...gameData,
      hands: newHands,
      trick: newTrick
    };
  }

  private processSpadesMove(gameData: GameData, move: GameMove, playerId: string): GameData {
    if (gameData.phase === 'bidding') {
      return {
        ...gameData,
        bids: { ...gameData.bids, [playerId]: move.data.bid }
      };
    }
    
    // Card play logic
    const newHands = { ...gameData.hands };
    const { card } = move.data;
    
    newHands[playerId] = newHands[playerId].filter((c: string) => c !== card);
    
    return {
      ...gameData,
      hands: newHands
    };
  }

  private processCrazy8sMove(gameData: GameData, move: GameMove, playerId: string): GameData {
    const newHands = { ...gameData.hands };
    const { card, newSuit } = move.data;
    
    if (move.type === 'play_card') {
      newHands[playerId] = newHands[playerId].filter((c: string) => c !== card);
      
      return {
        ...gameData,
        hands: newHands,
        discardPile: [...gameData.discardPile, card],
        currentSuit: newSuit || null
      };
    }
    
    if (move.type === 'draw_card') {
      const newDrawPile = [...gameData.drawPile];
      const drawnCard = newDrawPile.pop();
      
      if (drawnCard) {
        newHands[playerId] = [...newHands[playerId], drawnCard];
      }
      
      return {
        ...gameData,
        hands: newHands,
        drawPile: newDrawPile
      };
    }
    
    return gameData;
  }

  private processGoFishMove(gameData: GameData, move: GameMove, playerId: string): GameData {
    const { targetPlayer, rank } = move.data;
    const newHands = { ...gameData.hands };
    const targetCards = newHands[targetPlayer].filter((card: string) => card.startsWith(rank));
    
    if (targetCards.length > 0) {
      // Transfer cards
      newHands[targetPlayer] = newHands[targetPlayer].filter((card: string) => !card.startsWith(rank));
      newHands[playerId] = [...newHands[playerId], ...targetCards];
    } else {
      // Go fish - draw a card
      const newDrawPile = [...gameData.drawPile];
      const drawnCard = newDrawPile.pop();
      
      if (drawnCard) {
        newHands[playerId] = [...newHands[playerId], drawnCard];
      }
    }
    
    return {
      ...gameData,
      hands: newHands,
      drawPile: gameData.drawPile.slice(0, -1)
    };
  }

  private createStandardDeck(): string[] {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: string[] = [];
    
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push(`${rank}${suit}`);
      });
    });
    
    return deck;
  }

  private shuffleDeck(deck: string[]): string[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const gameEngine = new GameEngine();
