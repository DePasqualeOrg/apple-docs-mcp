/**
 * Simple logger utility for consistent logging across the application.
 *
 * This is an MCP stdio server: stdout carries the JSON-RPC protocol, so every
 * log line must go to stderr. All levels use console.error/console.warn (both
 * write to stderr); none may use console.log, which would corrupt the protocol.
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (LogLevel = {}));
class Logger {
    enabled = process.env.MCP_DEBUG === 'true';
    level = LogLevel.INFO;
    /**
     * Log debug message
     */
    debug(message, ...args) {
        if (this.enabled && this.shouldLog(LogLevel.DEBUG)) {
            console.error(`[DEBUG] ${message}`, ...args);
        }
    }
    /**
     * Log info message
     */
    info(message, ...args) {
        if (this.enabled && this.shouldLog(LogLevel.INFO)) {
            console.error(`[INFO] ${message}`, ...args);
        }
    }
    /**
     * Log warning message
     */
    warn(message, ...args) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    /**
     * Log error message
     */
    error(message, error) {
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
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    /**
     * Set log level
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
// Export singleton instance
export const logger = new Logger();
//# sourceMappingURL=logger.js.map