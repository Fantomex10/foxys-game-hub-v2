import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CreateRoomModalProps {
  onRoomCreated: (roomId: string) => void;
  onClose: () => void;
}

export function CreateRoomModal({ onRoomCreated, onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [isPrivate, setIsPrivate] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [allowSpectators, setAllowSpectators] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const userId = localStorage.getItem('userId');
      return apiRequest('POST', '/api/rooms', { ...roomData, hostId: userId });
    },
    onSuccess: (data) => {
      toast({
        title: 'Room Created',
        description: 'Your game room has been created successfully!'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      onRoomCreated(data.id);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create room. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = () => {
    if (!roomName.trim() || !gameType) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    createRoomMutation.mutate({
      name: roomName.trim(),
      gameType,
      maxPlayers: parseInt(maxPlayers),
      isPrivate,
      enableChat,
      allowSpectators,
      gameMode: 'multiplayer'
    });
  };

  const gameTypes = [
    { value: 'chess', label: 'Chess' },
    { value: 'hearts', label: 'Hearts' },
    { value: 'checkers', label: 'Checkers' },
    { value: 'crazy8s', label: 'Crazy 8s' },
    { value: 'spades', label: 'Spades' },
    { value: 'gofish', label: 'Go Fish' }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-game-navy border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Create Game Room</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="roomName" className="text-white">Room Name</Label>
            <Input
              id="roomName"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="bg-game-slate border-gray-600 text-white"
              data-testid="input-room-name"
            />
          </div>

          <div>
            <Label htmlFor="gameType" className="text-white">Game Type</Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger className="bg-game-slate border-gray-600 text-white" data-testid="select-game-type">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-game-navy border-gray-700">
                {gameTypes.map((game) => (
                  <SelectItem key={game.value} value={game.value} className="text-white hover:bg-game-slate">
                    {game.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="maxPlayers" className="text-white">Max Players</Label>
            <Select value={maxPlayers} onValueChange={setMaxPlayers}>
              <SelectTrigger className="bg-game-slate border-gray-600 text-white" data-testid="select-max-players">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-game-navy border-gray-700">
                <SelectItem value="2" className="text-white hover:bg-game-slate">2 Players</SelectItem>
                <SelectItem value="4" className="text-white hover:bg-game-slate">4 Players</SelectItem>
                <SelectItem value="6" className="text-white hover:bg-game-slate">6 Players</SelectItem>
                <SelectItem value="8" className="text-white hover:bg-game-slate">8 Players</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="private" className="text-white">Private Room</Label>
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                data-testid="switch-private"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="chat" className="text-white">Enable Chat</Label>
              <Switch
                id="chat"
                checked={enableChat}
                onCheckedChange={setEnableChat}
                data-testid="switch-chat"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="spectators" className="text-white">Allow Spectators</Label>
              <Switch
                id="spectators"
                checked={allowSpectators}
                onCheckedChange={setAllowSpectators}
                data-testid="switch-spectators"
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-600/20"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createRoomMutation.isPending}
              className="flex-1 game-button"
              data-testid="button-create-room"
            >
              {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}