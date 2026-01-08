import { useEffect, useRef, useState } from 'react';

// TypeScript interfaces for WebSocket events
export interface QuizQuestionEvent {
  type: 'quiz:question';
  question: string;
  timeLimit: number;
  questionId: string;
}

export interface QuizTimerEvent {
  type: 'quiz:timer';
  timeLeft: number;
  questionId: string;
}

export interface QuizResponseEvent {
  type: 'quiz:response';
  username: string;
  status: 'correct' | 'incorrect' | 'pending' | 'rate_limited';
  message: string;
  responseId: string;
}

export interface QuizWinnerEvent {
  type: 'quiz:winner';
  username: string;
  avatar: string;
  points: number;
  streak: number;
  questionId: string;
}

export interface QuizLeaderboardEvent {
  type: 'quiz:leaderboard';
  entries: Array<{
    rank: number;
    username: string;
    points: number;
    avatar: string;
  }>;
}

export interface QuizEndEvent {
  type: 'quiz:end';
  finalLeaderboard: Array<{
    rank: number;
    username: string;
    points: number;
  }>;
}

export type QuizEvent =
  | QuizQuestionEvent
  | QuizTimerEvent
  | QuizResponseEvent
  | QuizWinnerEvent
  | QuizLeaderboardEvent
  | QuizEndEvent;

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Configuration
  const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
  const RECONNECT_DELAY = 5000; // 5 seconds
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 10;

  let reconnectAttempts = 0;

  const connect = () => {
    if (socket?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        setSocket(ws);
        reconnectAttempts = 0;

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
            setLastHeartbeat(Date.now());
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data: QuizEvent = JSON.parse(event.data);

          // Handle different event types
          switch (data.type) {
            case 'quiz:question':
              console.log('New question:', data.question);
              break;
            case 'quiz:timer':
              console.log('Timer update:', data.timeLeft);
              break;
            case 'quiz:response':
              console.log('Response:', data.username, data.status);
              break;
            case 'quiz:winner':
              console.log('Winner:', data.username, data.points);
              break;
            case 'quiz:leaderboard':
              console.log('Leaderboard updated');
              break;
            case 'quiz:end':
              console.log('Quiz ended');
              break;
          }

          // Emit custom event for React components
          window.dispatchEvent(new CustomEvent('websocket:message', { detail: data }));

        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionState('disconnected');
        setSocket(null);

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt reconnection
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setConnectionState('error');
          console.error('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('error');
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    setConnectionState('disconnected');
  };

  const sendMessage = (message: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Connection health check
  useEffect(() => {
    const healthCheck = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;

      if (timeSinceLastHeartbeat > HEARTBEAT_INTERVAL * 2) {
        console.warn('WebSocket heartbeat timeout, reconnecting...');
        disconnect();
        connect();
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(healthCheck);
  }, [lastHeartbeat]);

  return {
    socket,
    connectionState,
    connect,
    disconnect,
    sendMessage,
    isConnected: connectionState === 'connected'
  };
}