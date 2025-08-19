import type { GameType, BotDifficulty } from "@shared/schema";
import type { GameData, GameMove } from "./game-engine";

class AIService {
  async getBotMove(gameType: GameType, gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    switch (gameType) {
      case 'chess':
        return this.getChessBotMove(gameData, difficulty);
      case 'checkers':
        return this.getCheckersBotMove(gameData, difficulty);
      case 'hearts':
        return this.getHeartsBotMove(gameData, difficulty);
      case 'spades':
        return this.getSpadesBotMove(gameData, difficulty);
      case 'crazy8s':
        return this.getCrazy8sBotMove(gameData, difficulty);
      case 'gofish':
        return this.getGoFishBotMove(gameData, difficulty);
      default:
        return null;
    }
  }

  private async getChessBotMove(gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    // Simplified chess AI - find all valid moves and pick one
    const validMoves = this.getValidChessMoves(gameData);
    
    if (validMoves.length === 0) return null;
    
    switch (difficulty) {
      case 'easy':
        // Random move
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      case 'medium':
        // Prefer captures
        const captures = validMoves.filter(move => this.isCapture(gameData, move));
        return captures.length > 0 
          ? captures[Math.floor(Math.random() * captures.length)]
          : validMoves[Math.floor(Math.random() * validMoves.length)];
      case 'hard':
        // Simple evaluation function
        return this.evaluateChessMoves(gameData, validMoves);
      default:
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
  }

  private async getCheckersBotMove(gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    const validMoves = this.getValidCheckersMove(gameData);
    
    if (validMoves.length === 0) return null;
    
    switch (difficulty) {
      case 'easy':
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      case 'medium':
        // Prefer captures
        const captures = validMoves.filter(move => move.data.captures && move.data.captures.length > 0);
        return captures.length > 0 
          ? captures[Math.floor(Math.random() * captures.length)]
          : validMoves[Math.floor(Math.random() * validMoves.length)];
      case 'hard':
        // Minimax-like evaluation
        return this.evaluateCheckersMoves(gameData, validMoves);
      default:
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
  }

  private async getHeartsBotMove(gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    // Simplified Hearts AI
    const currentPlayerId = gameData.players[gameData.turn!];
    const hand = gameData.hands[currentPlayerId];
    
    if (!hand || hand.length === 0) return null;
    
    // Basic strategy: avoid hearts and queen of spades
    const safeCards = hand.filter((card: string) => !card.includes('♥') && card !== 'Q♠');
    
    switch (difficulty) {
      case 'easy':
        return {
          type: 'play_card',
          data: { card: hand[Math.floor(Math.random() * hand.length)] }
        };
      case 'medium':
        const cardToPlay = safeCards.length > 0 
          ? safeCards[Math.floor(Math.random() * safeCards.length)]
          : hand[Math.floor(Math.random() * hand.length)];
        return {
          type: 'play_card',
          data: { card: cardToPlay }
        };
      case 'hard':
        // More sophisticated Hearts strategy
        return this.evaluateHeartsMove(gameData, hand);
      default:
        return {
          type: 'play_card',
          data: { card: hand[Math.floor(Math.random() * hand.length)] }
        };
    }
  }

  private async getSpadesBotMove(gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    if (gameData.phase === 'bidding') {
      const currentPlayerId = gameData.players[gameData.turn!];
      const hand = gameData.hands[currentPlayerId];
      
      // Simple bidding strategy
      const spades = hand.filter((card: string) => card.includes('♠')).length;
      const honors = hand.filter((card: string) => ['A', 'K', 'Q', 'J'].some(rank => card.startsWith(rank))).length;
      
      let bid = Math.max(1, Math.floor(spades / 2) + Math.floor(honors / 3));
      
      if (difficulty === 'easy') {
        bid += Math.floor(Math.random() * 3) - 1; // ±1 randomness
      }
      
      return {
        type: 'bid',
        data: { bid: Math.max(0, Math.min(13, bid)) }
      };
    }
    
    // Card play logic
    const currentPlayerId = gameData.players[gameData.turn!];
    const hand = gameData.hands[currentPlayerId];
    
    return {
      type: 'play_card',
      data: { card: hand[Math.floor(Math.random() * hand.length)] }
    };
  }

  private async getCrazy8sBotMove(gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    const currentPlayerId = gameData.players[gameData.turn!];
    const hand = gameData.hands[currentPlayerId];
    const topCard = gameData.discardPile[gameData.discardPile.length - 1];
    
    // Find playable cards
    const playableCards = hand.filter((card: string) => {
      if (card.startsWith('8')) return true;
      
      const topSuit = gameData.currentSuit || topCard.slice(-1);
      const topRank = topCard.slice(0, -1);
      
      return card.slice(-1) === topSuit || card.slice(0, -1) === topRank;
    });
    
    if (playableCards.length > 0) {
      const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
      
      // If playing an 8, choose a suit
      let newSuit = null;
      if (cardToPlay.startsWith('8')) {
        const suits = ['♠', '♥', '♦', '♣'];
        const suitCounts = suits.map(suit => 
          hand.filter((card: string) => card.slice(-1) === suit).length
        );
        const maxCount = Math.max(...suitCounts);
        const bestSuits = suits.filter((_, i) => suitCounts[i] === maxCount);
        newSuit = bestSuits[Math.floor(Math.random() * bestSuits.length)];
      }
      
      return {
        type: 'play_card',
        data: { card: cardToPlay, newSuit }
      };
    }
    
    // Must draw a card
    return {
      type: 'draw_card',
      data: {}
    };
  }

  private async getGoFishBotMove(gameData: GameData, difficulty: BotDifficulty): Promise<GameMove | null> {
    const currentPlayerId = gameData.players[gameData.turn!];
    const hand = gameData.hands[currentPlayerId];
    
    // Find ranks in hand
    const ranks = Array.from(new Set(hand.map((card: string) => card.slice(0, -1))));
    const targetRank = ranks[Math.floor(Math.random() * ranks.length)];
    
    // Choose target player
    const otherPlayers = gameData.players.filter(p => p !== currentPlayerId);
    const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
    
    return {
      type: 'ask_for_cards',
      data: { targetPlayer, rank: targetRank }
    };
  }

  // Helper methods for move generation and evaluation
  private getValidChessMoves(gameData: GameData): GameMove[] {
    const moves: GameMove[] = [];
    const board = gameData.board;
    const isWhiteTurn = gameData.turn === 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece !== isWhiteTurn) continue;
        
        // Generate moves for this piece (simplified)
        const pieceMoves = this.generatePieceMoves(board, row, col, piece);
        moves.push(...pieceMoves);
      }
    }
    
    return moves;
  }

  private generatePieceMoves(board: any[][], row: number, col: number, piece: string): GameMove[] {
    const moves: GameMove[] = [];
    
    // Simplified move generation - just try adjacent squares
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
          const targetPiece = board[newRow][newCol];
          if (!targetPiece || this.isOpponentPiece(piece, targetPiece)) {
            moves.push({
              type: 'move',
              data: {
                from: { row, col },
                to: { row: newRow, col: newCol }
              }
            });
          }
        }
      }
    }
    
    return moves;
  }

  private getValidCheckersMove(gameData: GameData): GameMove[] {
    const moves: GameMove[] = [];
    const board = gameData.board;
    const isRedTurn = gameData.turn === 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const isRedPiece = piece.toLowerCase() === 'r';
        if (isRedPiece !== isRedTurn) continue;
        
        // Generate checker moves
        const pieceMoves = this.generateCheckerMoves(board, row, col, piece);
        moves.push(...pieceMoves);
      }
    }
    
    return moves;
  }

  private generateCheckerMoves(board: any[][], row: number, col: number, piece: string): GameMove[] {
    const moves: GameMove[] = [];
    const isRed = piece.toLowerCase() === 'r';
    const direction = isRed ? -1 : 1;
    
    // Normal moves
    for (const dc of [-1, 1]) {
      const newRow = row + direction;
      const newCol = col + dc;
      
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 && !board[newRow][newCol]) {
        moves.push({
          type: 'move',
          data: {
            from: { row, col },
            to: { row: newRow, col: newCol },
            captures: []
          }
        });
      }
    }
    
    // Capture moves (simplified)
    for (const dc of [-1, 1]) {
      const jumpRow = row + direction * 2;
      const jumpCol = col + dc * 2;
      const middleRow = row + direction;
      const middleCol = col + dc;
      
      if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && 
          !board[jumpRow][jumpCol] && board[middleRow] && board[middleRow][middleCol] &&
          this.isOpponentPiece(piece, board[middleRow][middleCol])) {
        moves.push({
          type: 'move',
          data: {
            from: { row, col },
            to: { row: jumpRow, col: jumpCol },
            captures: [{ row: middleRow, col: middleCol }]
          }
        });
      }
    }
    
    return moves;
  }

  private isCapture(gameData: GameData, move: GameMove): boolean {
    const { to } = move.data;
    return gameData.board[to.row][to.col] !== null;
  }

  private isOpponentPiece(piece1: string, piece2: string): boolean {
    const isWhite1 = piece1 === piece1.toUpperCase();
    const isWhite2 = piece2 === piece2.toUpperCase();
    return isWhite1 !== isWhite2;
  }

  private evaluateChessMoves(gameData: GameData, moves: GameMove[]): GameMove {
    // Simple evaluation: prefer captures, then central control
    let bestMove = moves[0];
    let bestScore = -Infinity;
    
    for (const move of moves) {
      let score = 0;
      
      // Prefer captures
      if (this.isCapture(gameData, move)) {
        score += 10;
      }
      
      // Prefer central squares
      const { to } = move.data;
      const centerDistance = Math.abs(to.row - 3.5) + Math.abs(to.col - 3.5);
      score -= centerDistance;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  private evaluateCheckersMoves(gameData: GameData, moves: GameMove[]): GameMove {
    // Prefer captures, then advancing
    let bestMove = moves[0];
    let bestScore = -Infinity;
    
    for (const move of moves) {
      let score = 0;
      
      // Heavily prefer captures
      if (move.data.captures && move.data.captures.length > 0) {
        score += 100 * move.data.captures.length;
      }
      
      // Prefer advancing
      const { from, to } = move.data;
      const isRed = gameData.turn === 0;
      const advancement = isRed ? from.row - to.row : to.row - from.row;
      score += advancement * 5;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  private evaluateHeartsMove(gameData: GameData, hand: string[]): GameMove {
    // Advanced Hearts strategy would go here
    // For now, just avoid hearts and queen of spades
    const safeCards = hand.filter((card: string) => !card.includes('♥') && card !== 'Q♠');
    const cardToPlay = safeCards.length > 0 
      ? safeCards[0]
      : hand[0];
    
    return {
      type: 'play_card',
      data: { card: cardToPlay }
    };
  }
}

export const aiService = new AIService();