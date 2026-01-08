/**
 * Types et interfaces pour l'intégration TikTok Live
 */


export enum ReconnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  RECONNECT_FAILED = 'RECONNECT_FAILED',
  DEGRADED_MODE = 'DEGRADED_MODE'
}

export interface TikTokConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
  retryCount: number;
  reconnectionState?: ReconnectionState;
}

export interface TikTokConnectionConfig {
  sessionId: string;
  cookies: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface TikTokEvent {
  type: 'connect' | 'disconnect' | 'error' | 'comment' | 'fallback';
  timestamp: Date;
  data?: any;
  correlationId?: string;
  latency?: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  state: CircuitBreakerState;
  stateChangedAt: Date;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  timestamp: Date;
  error?: string;
}

export interface TikTokComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  sessionId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}