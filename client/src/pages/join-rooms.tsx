import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Users, Eye, Lock, Clock, Play, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, GameRoom } from "@shared/schema";

export default function JoinRooms() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading, refetch } = useQuery<GameRoom[]>({
    queryKey: ['/api/rooms'],
    refetchInterval: 5000,
  });

  const joinRoomMutation = useMutation({
    mutationFn: async ({ roomId, isSpectator }: { roomId: string; isSpectator?: boolean }) => {
      const response = await apiRequest('POST', `/api/rooms/${roomId}/join`, {
        userId: user?.id,
        isSpectator: isSpectator || false
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Joined Room',
        description: `Successfully joined ${variables.isSpectator ? 'as spectator' : 'as player'}!`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setLocation(`/lobby/${variables.roomId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Join',
        description: error.message || 'Unable to join room. It may be full or no longer available.',
        variant: 'destructive'
      });
    }
  });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    if (!userId || !username) {
      setLocation("/");
      return;
    }
    setUser({ id: userId, username, isGuest: true, createdAt: new Date() });
  }, [setLocation]);

  if (!user) return null;

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

  const getGameIcon = (gameType: string) => {
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

  // Filter rooms
  const filteredRooms = rooms.filter((room: GameRoom) => {
    const matchesSearch = room.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesGameType = gameTypeFilter === 'all' || room.gameType === gameTypeFilter;
    const isJoinable = room.status === 'waiting' || (room.status === 'playing' && room.allowSpectators);
    return matchesSearch && matchesGameType && isJoinable;
  });

  const gameTypes = ['all', 'chess', 'checkers', 'hearts', 'spades', 'crazy8s', 'gofish'];

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
              <h1 className="text-xl font-bold text-white" data-testid="text-join-rooms-title">Join Game Rooms</h1>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="text-gray-400 hover:text-white"
              data-testid="button-refresh"
            >
              <RefreshCw size={20} />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="mb-6">
          <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white text-lg">Find Games</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      type="text"
                      placeholder="Search room names..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                      data-testid="input-search-rooms"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <select
                    value={gameTypeFilter}
                    onChange={(e) => setGameTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                    data-testid="select-game-type-filter"
                  >
                    {gameTypes.map(type => (
                      <option key={type} value={type}>
                        {type === 'all' ? 'All Games' : getGameDisplayName(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rooms List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-white">Loading rooms...</div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Available Rooms</h3>
              <p className="text-gray-400 mb-4">There are no rooms matching your criteria.</p>
              <Button 
                onClick={() => setLocation("/hub")}
                className="game-button"
                data-testid="button-create-room-redirect"
              >
                Create a Room Instead
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRooms.map((room: GameRoom) => (
              <Card key={room.id} className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50 hover:border-game-blue transition-colors" data-testid={`card-room-${room.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white flex items-center space-x-2">
                      <span className="text-2xl">{getGameIcon(room.gameType)}</span>
                      <span data-testid={`text-room-name-${room.id}`}>{room.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                      {room.isPrivate && <Lock className="h-4 w-4 text-gray-400" />}
                      {room.allowSpectators && <Eye className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{getGameDisplayName(room.gameType)}</Badge>
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(room.status)}`}></span>
                    <span className="text-sm text-gray-400">{getStatusText(room.status)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span data-testid={`text-room-players-${room.id}`}>Players: 1/{room.maxPlayers}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Just now</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {room.status === 'waiting' && (
                      <Button
                        onClick={() => joinRoomMutation.mutate({ roomId: room.id, isSpectator: false })}
                        disabled={joinRoomMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`button-join-as-player-${room.id}`}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Join as Player
                      </Button>
                    )}
                    
                    {room.allowSpectators && (
                      <Button
                        onClick={() => joinRoomMutation.mutate({ roomId: room.id, isSpectator: true })}
                        disabled={joinRoomMutation.isPending}
                        variant="outline"
                        className={`${room.status === 'waiting' ? 'flex-none' : 'flex-1'} border-gray-600 text-gray-300 hover:bg-gray-700`}
                        data-testid={`button-join-as-spectator-${room.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Spectate
                      </Button>
                    )}
                  </div>

                  {room.status === 'playing' && !room.allowSpectators && (
                    <div className="text-center py-2">
                      <span className="text-yellow-400 text-sm flex items-center justify-center">
                        <Play className="h-4 w-4 mr-1" />
                        Game in progress
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}