import { Card, CardContent } from '@/components/ui/card';
import { Crown, Check, Clock } from 'lucide-react';

interface PlayerCardProps {
  participant: {
    id: string;
    userId: string;
    isReady: boolean;
    isSpectator: boolean;
  };
  isHost: boolean;
  isCurrentUser: boolean;
}

export function PlayerCard({ participant, isHost, isCurrentUser }: PlayerCardProps) {
  const getUserInitials = (userId: string) => {
    return userId.split('_').map(part => part[0]).join('').toUpperCase();
  };

  return (
    <Card className={`bg-game-navy/50 backdrop-blur-sm border-gray-700/50 ${isCurrentUser ? 'ring-2 ring-game-blue' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3" data-testid={`player-card-${participant.userId}`}>
          <div className="player-avatar bg-gradient-to-br from-blue-500 to-purple-500">
            <span>{getUserInitials(participant.userId)}</span>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-white font-medium">
                {isCurrentUser ? 'You' : participant.userId}
              </p>
              {isHost && (
                <Crown className="text-yellow-500" size={16} data-testid="host-crown" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              {participant.isReady ? (
                <div className="flex items-center space-x-1">
                  <Check className="text-green-400" size={14} />
                  <span className="text-green-400 text-sm">Ready</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Clock className="text-yellow-400" size={14} />
                  <span className="text-yellow-400 text-sm">Not Ready</span>
                </div>
              )}
            </div>
          </div>

          <div className={`w-3 h-3 rounded-full ${participant.isReady ? 'bg-green-500' : 'bg-gray-500'}`} />
        </div>
      </CardContent>
    </Card>
  );
}