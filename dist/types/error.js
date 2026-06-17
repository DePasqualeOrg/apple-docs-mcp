/**
 * Error handling types
 */
/**
 * Application error types
 */
export var ErrorType;
(function (ErrorType) {
    ErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorType["PARSE_ERROR"] = "PARSE_ERROR";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorType["TIMEOUT"] = "TIMEOUT";
    ErrorType["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorType["API_ERROR"] = "API_ERROR";
    ErrorType["CACHE_ERROR"] = "CACHE_ERROR";
    ErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorType["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorType["UNKNOWN"] = "UNKNOWN";
})(ErrorType || (ErrorType = {}));
//# sourceMappingURL=error.js.map