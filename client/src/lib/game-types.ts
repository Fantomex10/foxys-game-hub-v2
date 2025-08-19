export interface GameInfo {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  category: 'board' | 'card';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  rules: string[];
}

export const GAME_DEFINITIONS: Record<string, GameInfo> = {
  chess: {
    id: 'chess',
    name: 'Chess',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'The classic strategy board game',
    category: 'board',
    difficulty: 'hard',
    estimatedTime: '30-60 min',
    rules: [
      'Players alternate turns moving pieces',
      'Goal is to checkmate the opponent\'s king',
      'Each piece has unique movement patterns',
      'Special moves: castling, en passant'
    ]
  },
  
  checkers: {
    id: 'checkers',
    name: 'Checkers',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Strategic board game with jumping captures',
    category: 'board',
    difficulty: 'medium',
    estimatedTime: '15-30 min',
    rules: [
      'Move pieces diagonally on dark squares',
      'Capture by jumping over opponent pieces',
      'Reach the end to become a king',
      'Eliminate all opponent pieces to win'
    ]
  },
  
  hearts: {
    id: 'hearts',
    name: 'Hearts',
    minPlayers: 4,
    maxPlayers: 4,
    description: 'Trick-taking card game where you avoid penalty cards',
    category: 'card',
    difficulty: 'medium',
    estimatedTime: '20-40 min',
    rules: [
      'Avoid taking hearts (1 point each)',
      'Avoid the Queen of Spades (13 points)',
      'Lowest score wins after someone reaches 100',
      'Shooting the moon scores 26 for others'
    ]
  },
  
  spades: {
    id: 'spades',
    name: 'Spades',
    minPlayers: 4,
    maxPlayers: 4,
    description: 'Partnership trick-taking game with bidding',
    category: 'card',
    difficulty: 'medium',
    estimatedTime: '30-45 min',
    rules: [
      'Bid on number of tricks you\'ll take',
      'Spades are always trump',
      'Must follow suit if possible',
      'Score points by making your bid'
    ]
  },
  
  crazy8s: {
    id: 'crazy8s',
    name: 'Crazy 8s',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Shedding card game similar to Uno',
    category: 'card',
    difficulty: 'easy',
    estimatedTime: '10-20 min',
    rules: [
      'Match suit or rank of the top card',
      '8s can be played anytime and change suit',
      'First to empty hand wins',
      'Draw cards if you cannot play'
    ]
  },
  
  gofish: {
    id: 'gofish',
    name: 'Go Fish',
    minPlayers: 2,
    maxPlayers: 6,
    description: 'Collect books of four cards by asking opponents',
    category: 'card',
    difficulty: 'easy',
    estimatedTime: '10-15 min',
    rules: [
      'Ask opponents for cards of a specific rank',
      'If they don\'t have any, "Go Fish" and draw',
      'Collect books of 4 cards of same rank',
      'Most books wins when cards run out'
    ]
  }
};

export function getGameInfo(gameId: string): GameInfo | undefined {
  return GAME_DEFINITIONS[gameId];
}

export function getAllGames(): GameInfo[] {
  return Object.values(GAME_DEFINITIONS);
}

export function getGamesByCategory(category: 'board' | 'card'): GameInfo[] {
  return getAllGames().filter(game => game.category === category);
}

export function getGamesByPlayerCount(playerCount: number): GameInfo[] {
  return getAllGames().filter(game => 
    playerCount >= game.minPlayers && playerCount <= game.maxPlayers
  );
}
