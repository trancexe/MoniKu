/**
 * Utility logger to safely handle logging without exposing sensitive information
 * in production, while maintaining debuggability in development.
 */

export function logError(message: string, error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    // In development, log the full error stack
    console.error(message, error);
  } else {
    // In production, we might want to send this to an error tracking service (like Sentry)
    // For now, we only log the generic message and basic error info without full stack traces or PII
    if (error instanceof Error) {
      console.error(`${message}: ${error.name} - ${error.message}`);
    } else if (error !== undefined) {
      console.error(`${message}:`, String(error));
    } else {
      console.error(message);
    }
  }
}
