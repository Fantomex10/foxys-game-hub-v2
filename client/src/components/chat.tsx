import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
}

interface ChatProps {
  roomId: string;
  onSendMessage: (message: string) => void;
}

export function Chat({ roomId, onSendMessage }: ChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      userId: 'System',
      message: 'Welcome to the game room!',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: 'You',
      message: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    onSendMessage(message.trim());
    setMessage('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="bg-game-navy/50 backdrop-blur-sm border-gray-700/50 h-80 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg">Chat</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3" data-testid="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className="text-sm" data-testid={`chat-message-${msg.id}`}>
              <div className="flex items-baseline space-x-2">
                <span className={`font-medium ${msg.userId === 'System' ? 'text-blue-400' : msg.userId === 'You' ? 'text-green-400' : 'text-purple-400'}`}>
                  {msg.userId}:
                </span>
                <span className="text-white">{msg.message}</span>
                <span className="text-gray-500 text-xs ml-auto">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-game-slate border-gray-600 text-white"
            data-testid="input-chat-message"
          />
          <Button 
            type="submit" 
            size="icon"
            className="bg-game-blue hover:bg-game-blue/80"
            data-testid="button-send-message"
          >
            <Send size={16} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}