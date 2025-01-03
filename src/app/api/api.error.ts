import {HttpErrorResponse} from "@angular/common/http";

/**
 * Custom error class for API-related errors.
 * Provides structured error information including HTTP status, error code, and details.
 *
 * @example
 * ```typescript
 * throw new ApiError('Resource not found', {
 *   status: 404,
 *   code: 'RESOURCE_NOT_FOUND',
 *   path: '/api/users/123'
 * });
 * ```
 */
export class ApiError extends Error {
  /** ISO timestamp when the error occurred */
  public readonly timestamp: string;
  /** HTTP status code */
  public readonly status: number;
  /** Path where the error occurred */
  public readonly path: string;
  /** Error code for categorizing the error */
  public readonly code?: string;
  /** Additional error details */
  public readonly details?: any;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      path?: string;
      details?: any;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.timestamp = new Date().toISOString();
    this.status = options.status || 500;
    this.path = options.path || '';
    this.code = options.code;
    this.details = options.details;
  }

  /**
   * Creates an ApiError instance from an HttpErrorResponse
   * Handles both client-side and server-side errors
   * @param httpErrorResponse The HttpErrorResponse to convert
   */
  static fromHttpError(httpErrorResponse: HttpErrorResponse): ApiError {
    if (httpErrorResponse.error instanceof ErrorEvent) {
      // Client-side error (network issues, etc.)
      return new ApiError(httpErrorResponse.error.message, {
        status: 0,
        code: 'CLIENT_ERROR',
        details: httpErrorResponse.error
      });
    }

    // Server-side error
    return new ApiError(
      httpErrorResponse.error?.message || httpErrorResponse.message || 'Unknown error occurred',
      {
        status: httpErrorResponse.status,
        code: httpErrorResponse.error?.code || `HTTP_${httpErrorResponse.status}`,
        path: httpErrorResponse.url || '',
        details: httpErrorResponse.error
      }
    );
  }

  /**
   * Converts the error to a plain object for serialization
   */
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      status: this.status,
      code: this.code,
      timestamp: this.timestamp,
      path: this.path,
      details: this.details
    };
  }
}
