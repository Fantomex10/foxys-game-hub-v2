import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GameType } from '@shared/schema';

interface CreateRoomModalProps {
  onRoomCreated: (roomId: string) => void;
  onClose: () => void;
}

export function CreateRoomModal({ onRoomCreated, onClose }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState<GameType>('chess');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create room');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      onRoomCreated(data.room.id);
      toast({
        title: 'Room Created',
        description: `${roomName} is ready for players!`,
      });
    },
    onError: () => {
      toast({
        title: 'Failed to Create Room',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast({
        title: 'Room Name Required',
        description: 'Please enter a name for your room',
        variant: 'destructive',
      });
      return;
    }

    createRoomMutation.mutate({
      name: roomName.trim(),
      gameType,
      maxPlayers: parseInt(maxPlayers),
      isPrivate,
      gameMode: 'multiplayer',
      settings: {},
      allowSpectators: true,
      enableChat: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Game Room</CardTitle>
          <CardDescription>
            Set up a new game for you and your friends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                placeholder="Enter room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                data-testid="input-room-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gameType">Game Type</Label>
              <Select value={gameType} onValueChange={(value) => setGameType(value as GameType)}>
                <SelectTrigger data-testid="select-game-type">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chess">Chess</SelectItem>
                  <SelectItem value="checkers">Checkers</SelectItem>
                  <SelectItem value="hearts">Hearts</SelectItem>
                  <SelectItem value="spades">Spades</SelectItem>
                  <SelectItem value="crazy8s">Crazy 8s</SelectItem>
                  <SelectItem value="gofish">Go Fish</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Max Players</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger data-testid="select-max-players">
                  <SelectValue placeholder="Select max players" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Players</SelectItem>
                  <SelectItem value="4">4 Players</SelectItem>
                  <SelectItem value="6">6 Players</SelectItem>
                  <SelectItem value="8">8 Players</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                data-testid="checkbox-private"
              />
              <Label htmlFor="isPrivate">Private Room</Label>
            </div>

            <div className="flex space-x-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createRoomMutation.isPending}
                data-testid="button-create-room"
              >
                {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}