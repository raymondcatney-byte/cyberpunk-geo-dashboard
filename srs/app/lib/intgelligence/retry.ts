// Retry Manager with Exponential Backoff and Jitter

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: number;      // ± percentage (0-1)
  timeout: number;     // Per-request timeout
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,     // 1 second
  maxDelay: 16000,     // 16 seconds
  jitter: 0.2,         // ±20%
  timeout: 10000,      // 10 seconds
};

export interface RetryState {
  attempt: number;
  lastError?: Error;
  nextDelay: number;
}

export class RetryManager {
  private config: RetryConfig;
  private state: Map<string, RetryState> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  // Calculate delay with exponential backoff and jitter
  calculateDelay(attempt: number): number {
    // Exponential: 1s → 2s → 4s → 8s → 16s
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    // Add jitter: ±20%
    const jitterAmount = cappedDelay * this.config.jitter;
    const jitter = (Math.random() * 2 - 1) * jitterAmount;
    
    return Math.max(0, cappedDelay + jitter);
  }

  // Execute with retry
  async execute<T>(
    operation: () => Promise<T>,
    operationId: string = 'default'
  ): Promise<T> {
    let state = this.state.get(operationId) || { attempt: 0, nextDelay: 0 };
    
    while (state.attempt < this.config.maxAttempts) {
      state.attempt++;
      
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(operation);
        
        // Success - clear state
        this.state.delete(operationId);
        return result;
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        state.lastError = err;
        
        // Don't retry on certain errors
        if (!this.shouldRetry(err)) {
          throw err;
        }
        
        // Calculate next delay
        if (state.attempt < this.config.maxAttempts) {
          state.nextDelay = this.calculateDelay(state.attempt);
          this.state.set(operationId, state);
          
          console.log(`[Retry] Attempt ${state.attempt} failed, retrying in ${Math.round(state.nextDelay)}ms...`);
          await this.sleep(state.nextDelay);
        }
      }
    }
    
    // Max attempts reached
    throw new RetryExhaustedError(
      `Failed after ${this.config.maxAttempts} attempts`,
      state.lastError
    );
  }

  // Check if error is retryable
  private shouldRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Network errors - retry
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('abort') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return true;
    }
    
    // HTTP errors - retry on 5xx, rate limit (429)
    if (message.includes('http_5') || message.includes('429')) {
      return true;
    }
    
    // Don't retry on 4xx (client errors)
    if (message.includes('http_4')) {
      return false;
    }
    
    // Default: retry
    return true;
  }

  // Execute with timeout
  private executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
      
      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getState(operationId: string = 'default'): RetryState | undefined {
    return this.state.get(operationId);
  }

  reset(operationId: string = 'default'): void {
    this.state.delete(operationId);
  }

  resetAll(): void {
    this.state.clear();
  }
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly lastError?: Error
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

// Circuit Breaker
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 10,
  resetTimeout: 30000,    // 30 seconds
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime?: number;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitBreakerOpenError(
          'Circuit breaker is open - too many failures'
        );
      }
    }

    if (this.state === 'half-open' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new CircuitBreakerOpenError(
        'Circuit breaker half-open limit reached'
      );
    }

    if (this.state === 'half-open') {
      this.halfOpenCalls++;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.transitionTo('closed');
    }
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  private transitionTo(state: CircuitState): void {
    console.log(`[CircuitBreaker] Transitioning from ${this.state} to ${state}`);
    this.state = state;
    
    if (state === 'closed') {
      this.failures = 0;
      this.halfOpenCalls = 0;
    } else if (state === 'half-open') {
      this.halfOpenCalls = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    lastFailureTime?: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.transitionTo('closed');
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Combined retry + circuit breaker
export class ResilientExecutor {
  private retryManager: RetryManager;
  private circuitBreaker: CircuitBreaker;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    circuitConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryManager = new RetryManager(retryConfig);
    this.circuitBreaker = new CircuitBreaker(circuitConfig);
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationId: string = 'default'
  ): Promise<T> {
    return this.circuitBreaker.execute(() =>
      this.retryManager.execute(operation, operationId)
    );
  }

  getStats() {
    return {
      circuit: this.circuitBreaker.getStats(),
    };
  }

  reset(): void {
    this.circuitBreaker.reset();
    this.retryManager.resetAll();
  }
}
