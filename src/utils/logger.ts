/**
 * Simple logger utility for consistent logging across the application.
 *
 * This is an MCP stdio server: stdout carries the JSON-RPC protocol, so every
 * log line must go to stderr. All levels use console.error/console.warn (both
 * write to stderr); none may use console.log, which would corrupt the protocol.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  private enabled: boolean = process.env.MCP_DEBUG === 'true';
  private level: LogLevel = LogLevel.INFO;

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.enabled && this.shouldLog(LogLevel.DEBUG)) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.enabled && this.shouldLog(LogLevel.INFO)) {
      console.error(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`);
      if (error) {
        console.error(error);
      }
    }
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const logger = new Logger();