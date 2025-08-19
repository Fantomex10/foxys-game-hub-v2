import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
      const response = await apiRequest('POST', '/api/rooms', { ...roomData, hostId: userId });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Room creation response:', data); // Debug log
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
      <DialogContent className="sm:max-w-md bg-card border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Game Room</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your game room settings and invite players to join.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="roomName" className="text-foreground">Room Name</Label>
            <Input
              id="roomName"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              data-testid="input-room-name"
            />
          </div>

          <div>
            <Label htmlFor="gameType" className="text-foreground">Game Type</Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger className="bg-input border-border text-foreground" data-testid="select-game-type">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {gameTypes.map((game) => (
                  <SelectItem key={game.value} value={game.value} className="text-foreground hover:bg-accent hover:text-accent-foreground">
                    {game.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="maxPlayers" className="text-foreground">Max Players</Label>
            <Select value={maxPlayers} onValueChange={setMaxPlayers}>
              <SelectTrigger className="bg-input border-border text-foreground" data-testid="select-max-players">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="2" className="text-foreground hover:bg-accent hover:text-accent-foreground">2 Players</SelectItem>
                <SelectItem value="4" className="text-foreground hover:bg-accent hover:text-accent-foreground">4 Players</SelectItem>
                <SelectItem value="6" className="text-foreground hover:bg-accent hover:text-accent-foreground">6 Players</SelectItem>
                <SelectItem value="8" className="text-foreground hover:bg-accent hover:text-accent-foreground">8 Players</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="private" className="text-foreground">Private Room</Label>
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                data-testid="switch-private"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="chat" className="text-foreground">Enable Chat</Label>
              <Switch
                id="chat"
                checked={enableChat}
                onCheckedChange={setEnableChat}
                data-testid="switch-chat"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="spectators" className="text-foreground">Allow Spectators</Label>
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
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createRoomMutation.isPending}
              className="flex-1"
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