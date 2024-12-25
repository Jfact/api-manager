// api-config.types.ts
/**
 * Configuration for an individual API endpoint
 * @interface EndpointConfig
 */
export interface EndpointConfig {
  /** The URL path for this endpoint */
  path: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Optional number of retry attempts */
  retries?: number;
}

/**
 * Map of endpoint names to their configurations
 * @interface ApiEndpointMap
 */
export interface ApiEndpointMap {
  [key: string]: EndpointConfig;
}

/**
 * Global API configuration
 * @interface ApiConfig
 */
export interface ApiConfig {
  /** Base URL for all API endpoints */
  baseUrl: string;
  /** Map of endpoint configurations */
  endpoints: ApiEndpointMap;
  /** Default timeout in milliseconds for all endpoints */
  defaultTimeout?: number;
  /** Default number of retry attempts for all endpoints */
  defaultRetries?: number;
}

// api.ts
import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import {map, Observable, throwError} from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

/**
 * Parameters for pagination
 * @interface PaginationParams
 */
export interface PaginationParams {
  /** Page number, starting from 1 */
  page?: number;
  /** Number of items per page */
  limit?: number;
}

/**
 * Parameters for sorting
 * @interface SortParams
 */
export interface SortParams {
  /** Field name to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Generic filter parameters
 * @interface FilterParams
 */
export interface FilterParams {
  [key: string]: any;
}

/**
 * Combined search parameters for API queries
 * @interface ApiSearchParameters
 * @extends PaginationParams
 */
export interface ApiSearchParameters extends PaginationParams {
  /** Search query string */
  search?: string;
  /** Filter criteria */
  filter?: FilterParams;
  /** Sort criteria */
  sort?: SortParams[];
  /** Group by field */
  groupby?: string;
}

/**
 * Standard API response wrapper
 * @interface ApiResponse
 * @template T - Type of the response data
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Response metadata */
  metadata: {
    /** Timestamp of the response */
    timestamp: string;
    /** HTTP status code */
    statusCode: number;
    /** Optional message */
    message?: string;
  };
}

/**
 * Response wrapper for search operations
 * @interface ApiSearchResponse
 * @template T - Type of the individual items in the response
 * @extends ApiResponse
 */
export interface ApiSearchResponse<T> extends ApiResponse<T[]> {
  /** Pagination information */
  pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    pages: number;
  };
}

/**
 * Generic API service for handling REST operations
 * @class Api
 */
@Injectable()
export class Api {
  private readonly defaultTimeout: number;
  private readonly defaultRetries: number;

  /**
   * Creates an instance of Api
   * @param http - Angular HttpClient instance
   * @param config - API configuration
   */
  constructor(
    private http: HttpClient,
    @Inject('API_CONFIG') private config: ApiConfig
  ) {
    this.defaultTimeout = config.defaultTimeout || 5000;
    this.defaultRetries = config.defaultRetries || 2;
  }

  /**
   * Constructs the full URL for an API endpoint
   * @param path - Endpoint path
   * @returns Full API URL
   * @private
   */
  private getUrl(path: string): string {
    return `${this.config.baseUrl}/${path}`;
  }

  /**
   * Retrieves configuration for a specific endpoint
   * @param endpoint - Endpoint name
   * @returns Endpoint configuration
   * @throws Error if endpoint configuration is not found
   * @private
   */
  private getEndpointConfig(endpoint: string): EndpointConfig {
    const config = this.config.endpoints[endpoint];
    if (!config) {
      throw new Error(`Endpoint "${endpoint}" not found in API configuration`);
    }
    return config;
  }

  /**
   * Handles HTTP errors
   * @param error - HTTP error response
   * @returns Observable that errors with formatted error message
   * @private
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Builds HTTP parameters from search parameters
   * @param parameters - Search parameters
   * @returns HttpParams instance
   * @private
   */
  private buildHttpParams(parameters?: ApiSearchParameters): HttpParams {
    let params = new HttpParams();

    if (!parameters) return params;

    const { search, filter, sort, groupby, page = 1, limit = 100 } = parameters;

    if (search) params = params.set('search', search);
    if (filter) params = params.set('filter', JSON.stringify(filter));
    if (sort?.length) params = params.set('sort', JSON.stringify(sort));
    if (groupby) params = params.set('groupby', groupby);

    return params
      .set('page', page.toString())
      .set('limit', limit.toString());
  }

  /**
   * Searches resources with specified parameters
   * @template T - Type of the resource
   * @param endpoint - Endpoint name
   * @param parameters - Search parameters
   * @returns Observable of search results
   */
  search<T>(
    endpoint: string,
    parameters?: ApiSearchParameters
  ): Observable<ApiSearchResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);
    const params = this.buildHttpParams(parameters);

    return this.http
               .get<ApiSearchResponse<T>>(this.getUrl(endpointConfig.path), { params })
               .pipe(
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 retry({ count: endpointConfig.retries || this.defaultRetries, delay: 1000 }),
                 catchError(this.handleError)
               );
  }

  /**
   * Retrieves a specific resource by ID
   * @template T - Type of the resource
   * @param endpoint - Endpoint name
   * @param id - Resource identifier
   * @returns Observable of the resource
   */
  read<T>(endpoint: string, id: string): Observable<ApiResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .get<ApiResponse<T>>(`${this.getUrl(endpointConfig.path)}/${id}`)
               .pipe(
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 retry({ count: endpointConfig.retries || this.defaultRetries, delay: 1000 }),
                 catchError(this.handleError)
               );
  }

  /**
   * Creates a new resource
   * @template T - Type of the resource
   * @param endpoint - Endpoint name
   * @param data - Resource data
   * @returns Observable of the created resource
   */
  create<T>(endpoint: string, data: Partial<T>): Observable<ApiResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .post<ApiResponse<T>>(this.getUrl(endpointConfig.path), data)
               .pipe(
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 catchError(this.handleError)
               );
  }

  /**
   * Updates an existing resource
   * @template T - Type of the resource
   * @param endpoint - Endpoint name
   * @param id - Resource identifier
   * @param data - Updated resource data
   * @returns Observable of the updated resource
   */
  update<T>(
    endpoint: string,
    id: string,
    data: Partial<T>
  ): Observable<ApiResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .patch<T>(`${this.getUrl(endpointConfig.path)}/${id}`, data)
               .pipe(
                 map((response: T) => ({
                   data: response,
                   metadata: {
                     timestamp: new Date().toISOString(),
                     statusCode: 200,
                     message: 'Resource updated successfully',
                   },
                 })), // Transform response into ApiResponse<T>
                 // timeout(endpointConfig.timeout || this.defaultTimeout),
                 catchError(this.handleError)
               );
  }

  /**
   * Removes a resource
   * @param endpoint - Endpoint name
   * @param id - Resource identifier
   * @returns Observable of void
   */
  remove(endpoint: string, id: string): Observable<void> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .delete<void>(`${this.getUrl(endpointConfig.path)}/${id}`)
               .pipe(
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 catchError(this.handleError)
               );
  }
}
