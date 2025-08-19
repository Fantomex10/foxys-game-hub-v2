import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ChatMessage } from '@shared/schema';

interface ChatProps {
  roomId: string;
  onSendMessage: (message: string) => void;
}

export function Chat({ roomId, onSendMessage }: ChatProps) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', roomId],
    enabled: !!roomId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    onSendMessage(message.trim());
    setMessage('');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (date: Date | string | null) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3">
        <ScrollArea className="flex-1 h-60" ref={scrollRef}>
          <div className="space-y-2 p-2">
            {Array.isArray(messages) && messages.map((msg) => (
              <div
                key={msg.id}
                className="flex flex-col space-y-1"
                data-testid={`message-${msg.id}`}
              >
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span className="font-medium">
                    {msg.messageType === 'system' ? 'System' : 'Player'}
                  </span>
                  <span>{formatTime(msg.sentAt)}</span>
                </div>
                <div className={`text-sm p-2 rounded-lg max-w-xs ${
                  msg.messageType === 'system' 
                    ? 'bg-muted text-muted-foreground italic'
                    : 'bg-primary/10 text-foreground'
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}
            {(!messages || messages.length === 0) && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            )}
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-testid="input-chat-message"
          />
          <Button type="submit" size="icon" data-testid="button-send-message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}