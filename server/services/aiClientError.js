/**
 * Normalised error from the AI provider layer.
 * Providers translate their SDK-specific errors into this so routes
 * can react to codes without knowing which provider is in use.
 *
 * @property {'no_tool_call'|'empty_files'|'rate_limited'|'auth'|'unknown'} code
 */
class AiClientError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

module.exports = { AiClientError };
