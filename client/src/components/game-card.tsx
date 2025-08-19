import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Eye, Lock } from 'lucide-react';
import type { GameRoom } from '@shared/schema';

interface GameCardProps {
  room: GameRoom;
  onJoin: (roomId: string) => void;
}

export function GameCard({ room, onJoin }: GameCardProps) {
  const getGameDisplayName = (gameType: string) => {
    const gameNames: Record<string, string> = {
      chess: 'Chess',
      checkers: 'Checkers',
      hearts: 'Hearts',
      spades: 'Spades',
      crazy8s: 'Crazy 8s',
      gofish: 'Go Fish'
    };
    return gameNames[gameType] || gameType;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-green-500';
      case 'playing':
        return 'bg-yellow-500';
      case 'finished':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting for players';
      case 'playing':
        return 'Game in progress';
      case 'finished':
        return 'Finished';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`card-room-${room.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{room.name}</CardTitle>
          <div className="flex items-center space-x-1">
            {room.isPrivate && <Lock className="h-4 w-4 text-muted-foreground" />}
            {room.allowSpectators && <Eye className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        <CardDescription className="flex items-center space-x-2">
          <Badge variant="secondary">{getGameDisplayName(room.gameType)}</Badge>
          <span className={`w-2 h-2 rounded-full ${getStatusColor(room.status)}`}></span>
          <span className="text-sm">{getStatusText(room.status)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>Players: {room.currentPlayers || 0}/{room.maxPlayers}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{new Date(room.createdAt!).toLocaleDateString()}</span>
          </div>
        </div>
        
        <Button 
          className="w-full" 
          onClick={() => onJoin(room.id)}
          disabled={room.status === 'playing' && !room.allowSpectators}
          data-testid={`button-join-${room.id}`}
        >
          {room.status === 'waiting' ? 'Join Game' : 'Watch Game'}
        </Button>
      </CardContent>
    </Card>
  );
}