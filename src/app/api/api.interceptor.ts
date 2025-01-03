import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { ApiError } from './api.error';
import { ApiResponse } from './api.response';

/**
 * HTTP interceptor that handles API requests and responses.
 * Provides request/response transformation, error handling, retry logic, and authentication.
 *
 * Features:
 * - Adds standard headers (Content-Type, Accept)
 * - Handles authentication via Bearer token
 * - Implements configurable timeout and retry logic
 * - Transforms errors into ApiError instances
 * - Implements exponential backoff for retries
 * - Handles rate limiting via Retry-After header
 *
 * @example
 * ```typescript
 * // In your app.module.ts
 * @NgModule({
 *   providers: [
 *     { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true }
 *   ]
 * })
 * ```
 */
@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  /** Default timeout for requests in milliseconds */
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  /** Default number of retry attempts */
  private readonly DEFAULT_RETRIES = 2;
  /** Maximum delay between retries in milliseconds */
  private readonly MAX_RETRY_DELAY = 10000; // 10 seconds

  /**
   * Intercepts HTTP requests and applies common handling logic.
   *
   * @param request - The outgoing HTTP request
   * @param next - The next handler in the chain
   * @returns An Observable of the HTTP event stream
   *
   * @example
   * ```typescript
   * // Custom timeout for specific request
   * httpClient.get('/api/data', {
   *   headers: new HttpHeaders().set('X-Timeout', '5000')
   * });
   *
   * // Custom retry count for specific request
   * httpClient.get('/api/data', {
   *   headers: new HttpHeaders().set('X-Retries', '5')
   * });
   * ```
   */
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const timeoutValue = request.headers.get('X-Timeout')
      ? parseInt(request.headers.get('X-Timeout')!)
      : this.DEFAULT_TIMEOUT;

    const retries = request.headers.get('X-Retries')
      ? parseInt(request.headers.get('X-Retries')!)
      : this.DEFAULT_RETRIES;

    const apiRequest = request.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.getAuthHeaders()
      }
    });

    return next.handle(apiRequest).pipe(
      timeout(timeoutValue),
      retry({
        count: retries,
        delay: (error: any, retryCount: number) => {
          if (error instanceof HttpErrorResponse) {
            // Convert to ApiError for consistent error handling
            const apiError = ApiError.fromHttpError(error);

            // Don't retry client errors
            if (apiError.status >= 400 && apiError.status < 500) {
              return throwError(() => apiError);
            }

            // Handle rate limiting
            if (apiError.status === 429) {
              const retryAfter = error.headers.get('Retry-After');
              if (retryAfter) {
                const delayMs = parseInt(retryAfter) * 1000;
                return timer(Math.min(delayMs, this.MAX_RETRY_DELAY));
              }
            }
          }

          // Exponential backoff with max delay
          const delay = Math.min(
            1000 * Math.pow(2, retryCount),
            this.MAX_RETRY_DELAY
          );
          return timer(delay);
        }
      }),
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          return this.handleResponse(event);
        }
        return event;
      }),
      catchError((error) => {
        if (error instanceof ApiError) {
          // Error was already converted in retry logic
          return this.handleApiError(error, request);
        }
        if (error instanceof HttpErrorResponse) {
          const apiError = ApiError.fromHttpError(error);
          return this.handleApiError(apiError, request);
        }
        // Handle unexpected errors
        const apiError = new ApiError('An unexpected error occurred', {
          status: 500,
          code: 'UNEXPECTED_ERROR',
          details: error
        });
        return this.handleApiError(apiError, request);
      })
    );
  }

  /**
   * Retrieves authentication headers for the request.
   * Currently implements Bearer token authentication from localStorage.
   *
   * @returns Object containing authorization headers if a token exists
   * @private
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Handles successful HTTP responses.
   * Ensures response body follows ApiResponse structure.
   *
   * @param event - The HTTP response event
   * @returns Modified HTTP response with standardized body structure
   * @private
   */
  private handleResponse(event: HttpResponse<any>): HttpResponse<any> {
    if (event.body && event.body.metadata) {
      return event;
    }

    const apiResponse = new ApiResponse(event.body);

    return event.clone({ body: apiResponse });
  }

  /**
   * Handles API errors in a consistent way.
   * Logs errors, handles specific status codes, and transforms error format.
   *
   * @param error - The API error to handle
   * @param request - The original HTTP request
   * @returns Observable that errors with the transformed error
   * @private
   *
   * @example Error handling hierarchy:
   * 1. Network errors (status 0)
   * 2. Authentication errors (401)
   * 3. Authorization errors (403)
   * 4. Other API errors (maintain original error)
   */
  private handleApiError(error: ApiError, request: HttpRequest<any>): Observable<never> {
    // Log error with structured data
    console.error('API Error:', error.toJSON());

    // Handle specific error cases
    switch (error.status) {
      case 401:
        this.handleUnauthorized();
        break;
      case 403:
        this.handleForbidden();
        break;
      case 0:
        error = new ApiError('Network error occurred. Please check your connection.', {
          status: 0,
          code: 'NETWORK_ERROR',
          details: error.details
        });
        break;
    }

    return throwError(() => error);
  }

  /**
   * Handles unauthorized (401) responses.
   * Clears authentication state and prepares for re-authentication.
   *
   * @private
   */
  private handleUnauthorized(): void {
    localStorage.removeItem('authToken');
    // Add router navigation logic here
  }

  /**
   * Handles forbidden (403) responses.
   * Implements forbidden access handling logic.
   *
   * @private
   */
  private handleForbidden(): void {
    // Add forbidden handling logic here
  }
}
