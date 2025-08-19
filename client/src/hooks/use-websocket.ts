import { useState, useEffect, useRef } from "react";

export function useWebSocket(userId?: string, roomId?: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          setSocket(ws);
          reconnectAttemptsRef.current = 0;

          // Join room if roomId is provided
          if (roomId) {
            ws.send(JSON.stringify({
              type: 'join_room',
              userId,
              roomId
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            setLastMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          setIsConnected(false);
          setSocket(null);

          // Attempt to reconnect unless it was a manual close
          if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
              connect();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        return ws;
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        return null;
      }
    };

    const ws = connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send leave room message if in a room
        if (roomId) {
          ws.send(JSON.stringify({
            type: 'leave_room',
            userId,
            roomId
          }));
        }
        ws.close(1000, "Component unmounting");
      }
    };
  }, [userId, roomId]);

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    } else {
      console.warn("WebSocket is not connected");
      return false;
    }
  };

  return {
    socket,
    isConnected,
    lastMessage,
    sendMessage,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}
