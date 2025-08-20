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
    const color = isWhiteTurn ? 'white' : 'black';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece !== isWhiteTurn) continue;
        
        // Generate all possible moves for this piece
        const pieceMoves = this.generateChessPieceMoves(gameData, row, col, piece);
        moves.push(...pieceMoves);
      }
    }
    
    return moves;
  }

  private generateChessPieceMoves(gameData: GameData, row: number, col: number, piece: string): GameMove[] {
    const moves: GameMove[] = [];
    const board = gameData.board;
    
    // Generate moves based on piece type
    const directions = this.getPieceDirections(piece);
    const isSliding = ['r', 'b', 'q'].includes(piece.toLowerCase());
    
    for (const [dr, dc] of directions) {
      let distance = 1;
      const maxDistance = isSliding ? 8 : 1;
      
      while (distance <= maxDistance) {
        const newRow = row + dr * distance;
        const newCol = col + dc * distance;
        
        if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) break;
        
        const targetPiece = board[newRow][newCol];
        
        // Can't move to square with own piece
        if (targetPiece && this.isSameColor(piece, targetPiece)) break;
        
        // Test if this move is legal (doesn't put king in check)
        if (this.isLegalMove(gameData, { row, col }, { row: newRow, col: newCol })) {
          moves.push({
            type: 'chess_move',
            data: {
              from: { row, col },
              to: { row: newRow, col: newCol }
            }
          });
        }
        
        // Stop if we hit a piece
        if (targetPiece) break;
        
        distance++;
      }
    }
    
    return moves;
  }
  
  private getPieceDirections(piece: string): number[][] {
    switch (piece.toLowerCase()) {
      case 'p': // Pawn
        const isWhite = piece === piece.toUpperCase();
        const direction = isWhite ? -1 : 1;
        return [[direction, 0], [direction, -1], [direction, 1]];
      case 'r': // Rook
        return [[0, 1], [0, -1], [1, 0], [-1, 0]];
      case 'n': // Knight
        return [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
      case 'b': // Bishop
        return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      case 'q': // Queen
        return [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      case 'k': // King
        return [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      default:
        return [];
    }
  }
  
  private isLegalMove(gameData: GameData, from: {row: number, col: number}, to: {row: number, col: number}): boolean {
    // This should use the game engine's validation logic
    // For now, basic validation
    const board = gameData.board;
    const piece = board[from.row][from.col];
    const target = board[to.row][to.col];
    
    if (!piece) return false;
    if (target && this.isSameColor(piece, target)) return false;
    
    return true;
  }

  private getValidCheckersMove(gameData: GameData): GameMove[] {
    const moves: GameMove[] = [];
    const board = gameData.board;
    const isRedTurn = gameData.turn === 0;
    
    // First check for any available captures (captures are mandatory)
    const captureMoves: GameMove[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const isRedPiece = piece === 'red' || piece === 'redK';
        if (isRedPiece !== isRedTurn) continue;
        
        const pieceMoves = this.generateCheckerMoves(board, row, col, piece);
        const pieceCaptures = pieceMoves.filter(move => move.data.captures && move.data.captures.length > 0);
        captureMoves.push(...pieceCaptures);
      }
    }
    
    // If there are captures available, only return captures
    if (captureMoves.length > 0) {
      return captureMoves;
    }
    
    // Otherwise, return all regular moves
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const isRedPiece = piece === 'red' || piece === 'redK';
        if (isRedPiece !== isRedTurn) continue;
        
        const pieceMoves = this.generateCheckerMoves(board, row, col, piece);
        const regularMoves = pieceMoves.filter(move => !move.data.captures || move.data.captures.length === 0);
        moves.push(...regularMoves);
      }
    }
    
    return moves;
  }

  private generateCheckerMoves(board: any[][], row: number, col: number, piece: string): GameMove[] {
    const moves: GameMove[] = [];
    const isRed = piece === 'red' || piece === 'redK';
    const isKing = piece.includes('K');
    
    // Determine movement directions
    const directions = isKing ? 
      [[-1, -1], [-1, 1], [1, -1], [1, 1]] : // Kings can move in all diagonal directions
      isRed ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; // Regular pieces move forward only
    
    // Check for capture moves first (captures are mandatory)
    const captureMoves: GameMove[] = [];
    for (const [dr, dc] of directions) {
      const jumpRow = row + dr * 2;
      const jumpCol = col + dc * 2;
      const middleRow = row + dr;
      const middleCol = col + dc;
      
      if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && 
          !board[jumpRow][jumpCol] && board[middleRow] && board[middleRow][middleCol] &&
          this.isOpponentCheckersPiece(piece, board[middleRow][middleCol])) {
        captureMoves.push({
          type: 'move',
          data: {
            from: { row, col },
            to: { row: jumpRow, col: jumpCol },
            captures: [{ row: middleRow, col: middleCol }]
          }
        });
      }
    }
    
    // If captures are available, only return captures (mandatory)
    if (captureMoves.length > 0) {
      return captureMoves;
    }
    
    // Otherwise, generate normal moves
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
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
    
    return moves;
  }
  
  private isOpponentCheckersPiece(piece1: string, piece2: string): boolean {
    const isRed1 = piece1 === 'red' || piece1 === 'redK';
    const isRed2 = piece2 === 'red' || piece2 === 'redK';
    return isRed1 !== isRed2;
  }

  private isCapture(gameData: GameData, move: GameMove): boolean {
    const { to } = move.data;
    return gameData.board[to.row][to.col] !== null;
  }

  private isSameColor(piece1: string, piece2: string): boolean {
    return (piece1 === piece1.toUpperCase()) === (piece2 === piece2.toUpperCase());
  }
  
  private isOpponentPiece(piece1: string, piece2: string): boolean {
    return !this.isSameColor(piece1, piece2);
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