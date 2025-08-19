import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/player-card";
import { Chat } from "@/components/chat";
import { useWebSocket } from "@/hooks/use-websocket";
import { ArrowLeft, Settings, Crown, UserPlus, Play, Check, X } from "lucide-react";
import type { User, GameRoom, GameParticipant } from "@shared/schema";

export default function GameLobby() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();

  const { data: roomData, isLoading } = useQuery({
    queryKey: ['/api/rooms', roomId],
    enabled: !!roomId,
  });

  const { socket, isConnected } = useWebSocket(user?.id, roomId);

  const toggleReadyMutation = useMutation({
    mutationFn: async () => {
      // WebSocket message for ready toggle
      if (socket) {
        socket.send(JSON.stringify({
          type: 'ready_toggle'
        }));
      }
      return true;
    },
    onSuccess: () => {
      setIsReady(!isReady);
    },
  });

  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (socket) {
        socket.send(JSON.stringify({
          type: 'start_game'
        }));
      }
      return true;
    },
    onSuccess: () => {
      setLocation(`/game/${roomId}`);
    },
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) {
      setLocation("/");
      return;
    }
    setUser(JSON.parse(savedUser));
  }, [setLocation]);

  useEffect(() => {
    if (socket) {
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'participant_updated':
            queryClient.invalidateQueries({ queryKey: ['/api/rooms', roomId] });
            break;
          case 'game_started':
            setLocation(`/game/${roomId}`);
            break;
          case 'user_joined':
          case 'user_left':
            queryClient.invalidateQueries({ queryKey: ['/api/rooms', roomId] });
            break;
        }
      });
    }
  }, [socket, roomId, queryClient, setLocation]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Room Not Found</h2>
          <p className="text-gray-400 mb-4">The room you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/hub")} className="game-button">
            Back to Hub
          </Button>
        </div>
      </div>
    );
  }

  const { room, participants = [] } = roomData;
  const isHost = room.hostId === user.id;
  const currentUserParticipant = participants.find((p: GameParticipant) => p.userId === user.id);
  const players = participants.filter((p: GameParticipant) => !p.isSpectator);
  const spectators = participants.filter((p: GameParticipant) => p.isSpectator);
  const allPlayersReady = players.length > 1 && players.every((p: GameParticipant) => p.isReady);

  const getGameTypeIcon = (gameType: string) => {
    const icons: Record<string, string> = {
      chess: '♔',
      hearts: '♥',
      checkers: '⚫',
      crazy8s: '🎴',
      spades: '♠',
      gofish: '🎣'
    };
    return icons[gameType] || '🎮';
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
                onClick={() => setLocation("/hub")}
                className="text-gray-400 hover:text-white"
                data-testid="button-back"
              >
                <ArrowLeft size={20} />
              </Button>
              <h1 className="text-xl font-bold text-white" data-testid="text-lobby-title">Game Lobby</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`connection-indicator ${isConnected ? 'online' : 'offline'}`} data-testid="connection-indicator">
                <div className="dot"></div>
                <span className="text-sm text-green-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-lobby-settings">
                <Settings size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Room Info */}
        <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white" data-testid="text-room-name">{room.name}</h2>
                <p className="text-gray-400">
                  Room ID: <span className="font-mono" data-testid="text-room-id">{room.id}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium inline-block mb-2">
                  <span className="mr-1">{getGameTypeIcon(room.gameType)}</span>
                  {room.gameType.charAt(0).toUpperCase() + room.gameType.slice(1)}
                </div>
                <p className="text-gray-400 text-sm" data-testid="text-player-count">
                  {players.length}/{room.maxPlayers} Players
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Game Mode:</span>
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                {room.gameMode.charAt(0).toUpperCase() + room.gameMode.slice(1)}
              </span>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-400">
                Host: <span className="text-white">{participants.find((p: GameParticipant) => p.userId === room.hostId)?.userId || 'Unknown'}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players Section */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-white mb-4" data-testid="text-players-title">Players</h3>
            <div className="space-y-3">
              {players.map((participant: GameParticipant) => (
                <PlayerCard
                  key={participant.id}
                  participant={participant}
                  isHost={participant.userId === room.hostId}
                  isCurrentUser={participant.userId === user.id}
                />
              ))}

              {/* Empty Slots */}
              {Array.from({ length: room.maxPlayers - players.length }, (_, i) => (
                <Card key={`empty-${i}`} className="bg-game-slate/30 backdrop-blur-sm border-2 border-dashed border-gray-600">
                  <CardContent className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <UserPlus className="text-gray-500 text-2xl mb-2 mx-auto" size={32} />
                      <p className="text-gray-500">Waiting for players...</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Game Controls */}
            <div className="mt-6 space-y-3">
              {!currentUserParticipant?.isSpectator && (
                <Button
                  onClick={() => toggleReadyMutation.mutate()}
                  disabled={toggleReadyMutation.isPending}
                  className={`w-full font-semibold py-3 px-6 rounded-lg transition-all ${
                    isReady
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                  }`}
                  data-testid="button-ready-toggle"
                >
                  {isReady ? <X className="mr-2" size={16} /> : <Check className="mr-2" size={16} />}
                  {isReady ? 'Cancel Ready' : 'Ready to Play'}
                </Button>
              )}
              
              {isHost && (
                <Button
                  onClick={() => startGameMutation.mutate()}
                  disabled={!allPlayersReady || startGameMutation.isPending}
                  className="w-full game-button disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-start-game"
                >
                  <Play className="mr-2" size={16} />
                  Start Game
                </Button>
              )}
            </div>
          </div>

          {/* Chat & Settings */}
          <div className="space-y-6">
            {room.enableChat && (
              <Chat roomId={room.id} userId={user.id} />
            )}

            {/* Game Settings */}
            <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-4">Game Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Allow Spectators</span>
                    <span className="text-sm text-gray-400">
                      {room.allowSpectators ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Private Room</span>
                    <span className="text-sm text-gray-400">
                      {room.isPrivate ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Chat Enabled</span>
                    <span className="text-sm text-gray-400">
                      {room.enableChat ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
