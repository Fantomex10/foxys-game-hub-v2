import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async ({ username, isGuest }: { username: string; isGuest: boolean }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, isGuest }),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);
      queryClient.setQueryData(['user'], data.user);
      setLocation('/hub');
    },
    onError: () => {
      toast({
        title: 'Login Failed',
        description: 'Please try a different username or try again',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: 'Username Required',
        description: 'Please enter a username to continue',
        variant: 'destructive',
      });
      return;
    }
    
    loginMutation.mutate({ username: username.trim(), isGuest });
  };

  const handleGuestLogin = () => {
    const guestName = `Guest${Math.floor(Math.random() * 1000)}`;
    setUsername(guestName);
    setIsGuest(true);
    loginMutation.mutate({ username: guestName, isGuest: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Game Hub
          </h1>
          <p className="text-muted-foreground">
            Play board games and card games with friends
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Enter your username to start playing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-username"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Join Game Hub'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleGuestLogin}
                  disabled={loginMutation.isPending}
                  data-testid="button-guest-login"
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Play as Guest'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>No registration required • Play instantly</p>
        </div>
      </div>
    </div>
  );
}