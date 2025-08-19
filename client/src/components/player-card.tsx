import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, User, Bot, Check, X } from 'lucide-react';
import type { GameParticipant, User as UserType } from '@shared/schema';

interface PlayerCardProps {
  participant: GameParticipant;
  user?: UserType;
  isHost?: boolean;
  canKick?: boolean;
  onKick?: (participantId: string) => void;
}

export function PlayerCard({ participant, user, isHost, canKick, onKick }: PlayerCardProps) {
  const getPlayerName = () => {
    if (participant.playerType === 'bot') {
      return `Bot (${participant.botDifficulty})`;
    }
    return user?.username || 'Unknown Player';
  };

  const getPlayerIcon = () => {
    if (isHost) {
      return <Crown className="h-4 w-4 text-yellow-500" />;
    }
    if (participant.playerType === 'bot') {
      return <Bot className="h-4 w-4 text-blue-500" />;
    }
    return <User className="h-4 w-4 text-gray-500" />;
  };

  const getReadyIcon = () => {
    if (participant.isSpectator) {
      return null;
    }
    return participant.isReady ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card className="w-full" data-testid={`card-player-${participant.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPlayerIcon()}
            <div>
              <div className="font-medium">{getPlayerName()}</div>
              <div className="flex items-center space-x-2">
                {participant.isSpectator ? (
                  <Badge variant="secondary">Spectator</Badge>
                ) : (
                  <div className="flex items-center space-x-1">
                    {getReadyIcon()}
                    <span className="text-sm text-muted-foreground">
                      {participant.isReady ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {canKick && onKick && !isHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onKick(participant.id)}
              data-testid={`button-kick-${participant.id}`}
            >
              Kick
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}