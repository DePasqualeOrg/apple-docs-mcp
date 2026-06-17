/**
 * Simple logger utility for consistent logging across the application.
 *
 * This is an MCP stdio server: stdout carries the JSON-RPC protocol, so every
 * log line must go to stderr. All levels use console.error/console.warn (both
 * write to stderr); none may use console.log, which would corrupt the protocol.
 */
export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
declare class Logger {
    private enabled;
    private level;
    /**
     * Log debug message
     */
    debug(message: string, ...args: unknown[]): void;
    /**
     * Log info message
     */
    info(message: string, ...args: unknown[]): void;
    /**
     * Log warning message
     */
    warn(message: string, ...args: unknown[]): void;
    /**
     * Log error message
     */
    error(message: string, error?: unknown): void;
    /**
     * Check if should log based on level
     */
    private shouldLog;
    /**
     * Set log level
     */
    setLevel(level: LogLevel): void;
    /**
     * Enable/disable logging
     */
    setEnabled(enabled: boolean): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map