import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateRoomModal } from "@/components/create-room-modal";
import { Settings, Zap, Plus, Users, Wifi } from "lucide-react";
import type { User, GameRoom } from "@shared/schema";

const gameTypes = [
  {
    id: 'chess',
    name: 'Chess',
    players: '2 Players',
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'
  },
  {
    id: 'hearts',
    name: 'Hearts',
    players: '4 Players',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'
  },
  {
    id: 'checkers',
    name: 'Checkers',
    players: '2 Players',
    image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'
  },
  {
    id: 'crazy8s',
    name: 'Crazy 8s',
    players: '2-8 Players',
    image: 'https://pixabay.com/get/g961e3a7828c98ba9d6bce86c9aaefbc934a26e2f950cc79367f86e5aa6ecd9277666c08d4d628199a14cdf274be2027cf9d65cbce854d9d4d5125f83358ff30f_1280.jpg'
  },
  {
    id: 'spades',
    name: 'Spades',
    players: '4 Players',
    image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'
  },
  {
    id: 'gofish',
    name: 'Go Fish',
    players: '2-6 Players',
    image: 'https://pixabay.com/get/g6d8286f423c3ae70365f262342004d659315b9866cbdbc2096efe253a3f507dc204b0f46fd052c67e3f8f1d71a863c9498e221ccf19221f2b7a7698d013cd828_1280.jpg'
  }
];

export default function MainHub() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: activeRooms } = useQuery({
    queryKey: ['/api/rooms'],
    refetchInterval: 5000,
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

  const getUserInitials = (username: string) => {
    return username.split('_').map(part => part[0]).join('').toUpperCase();
  };

  const handleQuickPlay = () => {
    // TODO: Implement quick play matchmaking
    setLocation("/lobby/quick-play");
  };

  const handleJoinRoom = () => {
    setLocation("/join");
  };

  const handleLocalGames = () => {
    // TODO: Show local games options
    setLocation("/lobby/local");
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-gray-700/50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-game-blue to-game-emerald rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🎮</span>
              </div>
              <h1 className="text-xl font-bold text-white" data-testid="text-app-name">GameHub</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Player Info */}
              <div className="flex items-center space-x-3">
                <div className="player-avatar bg-gradient-to-br from-purple-500 to-pink-500" data-testid="avatar-user">
                  <span>{getUserInitials(user.username)}</span>
                </div>
                <span className="text-white font-medium" data-testid="text-username">{user.username}</span>
              </div>
              
              {/* Settings */}
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-settings">
                <Settings size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2" data-testid="text-welcome">Welcome back!</h2>
          <p className="text-gray-400">Choose your game mode and start playing</p>
        </div>

        {/* Game Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Quick Play */}
          <Card className="game-card group" onClick={handleQuickPlay} data-testid="card-quick-play">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Quick Play</h3>
              <p className="text-gray-400 text-sm mb-4">Join a game instantly with matchmaking</p>
              <div className="flex items-center justify-between">
                <span className="text-green-400 text-sm font-medium">Available</span>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </div>
            </CardContent>
          </Card>

          {/* Create Room */}
          <Card className="game-card group" onClick={() => setShowCreateModal(true)} data-testid="card-create-room">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Create Room</h3>
              <p className="text-gray-400 text-sm mb-4">Host a game with custom rules</p>
              <div className="flex items-center justify-between">
                <span className="text-blue-400 text-sm font-medium">Host</span>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </div>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="game-card group" onClick={handleJoinRoom} data-testid="card-join-room">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Join Room</h3>
              <p className="text-gray-400 text-sm mb-4">Find and join existing games</p>
              <div className="flex items-center justify-between">
                <span className="text-orange-400 text-sm font-medium">Join</span>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </div>
            </CardContent>
          </Card>

          {/* Local Games */}
          <Card className="game-card group" onClick={handleLocalGames} data-testid="card-local-games">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wifi className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Local Games</h3>
              <p className="text-gray-400 text-sm mb-4">Play offline or via local network</p>
              <div className="flex items-center justify-between">
                <span className="text-purple-400 text-sm font-medium">Offline</span>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Games Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4" data-testid="text-active-games">Your Active Games</h3>
          <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🎮</span>
                <p className="text-gray-400" data-testid="text-no-active-games">No active games</p>
                <p className="text-gray-500 text-sm mt-2">Start a new game to see it here</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Games Grid */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4" data-testid="text-available-games">Available Games</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {gameTypes.map((game) => (
              <Card key={game.id} className="game-card group cursor-pointer" data-testid={`card-game-${game.id}`}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">
                      {game.id === 'chess' && '♔'}
                      {game.id === 'hearts' && '♥'}
                      {game.id === 'checkers' && '⚫'}
                      {game.id === 'crazy8s' && '🎴'}
                      {game.id === 'spades' && '♠'}
                      {game.id === 'gofish' && '🎣'}
                    </div>
                    <h4 className="text-white font-semibold mb-1">{game.name}</h4>
                    <p className="text-gray-400 text-sm">{game.players}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateRoomModal
          onRoomCreated={(roomId) => {
            setShowCreateModal(false);
            setLocation(`/lobby/${roomId}`);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
