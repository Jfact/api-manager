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

import { ApiResponse, ApiSearchResponse } from './api.response';

/**
 * Core API service that handles HTTP requests to the backend.
 * Provides methods for CRUD operations and search functionality with configurable endpoints.
 *
 * @example
 * ```typescript
 * // Configure the API
 * const config: ApiConfig = {
 *   baseUrl: 'https://api.example.com',
 *   endpoints: {
 *     users: { path: 'users', timeout: 10000, retries: 3 }
 *   }
 * };
 *
 * // Use the API service
 * const api = new Api(httpClient, config);
 * api.search('users', { page: 1, limit: 10 })
 *    .subscribe(response => console.log(response));
 * ```
 */
@Injectable()
export class Api {
  private readonly defaultTimeout: number;
  private readonly defaultRetries: number;

  /**
   * Creates an instance of the Api service.
   *
   * @param http - Angular's HttpClient for making HTTP requests
   * @param config - API configuration including base URL and endpoint configurations
   * @throws Error if required configuration is missing
   */
  constructor(
    private http: HttpClient,
    @Inject('API_CONFIG') private config: ApiConfig
  ) {
    this.defaultTimeout = config.defaultTimeout || 5000;
    this.defaultRetries = config.defaultRetries || 0;
  }

  /**
   * Constructs the full URL for an API endpoint path.
   *
   * @param path - The endpoint path to append to the base URL
   * @returns The complete URL
   * @private
   */
  private getUrl(path: string): string {
    return `${this.config.baseUrl}/${path}`;
  }

  /**
   * Retrieves the configuration for a specific endpoint.
   *
   * @param endpoint - The name of the endpoint to get configuration for
   * @returns The endpoint configuration
   * @throws Error if the endpoint configuration is not found
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
   * Handles HTTP errors and transforms them into a consistent format.
   *
   * @param error - The HTTP error response
   * @returns An observable that errors with a formatted error message
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
   * Builds HTTP parameters from search parameters.
   *
   * @param parameters - Search parameters including pagination, filtering, and sorting
   * @returns HttpParams object with encoded parameters
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
   * Searches resources with specified parameters.
   *
   * @template T - Type of the resource
   * @template G - Type of grouped resources (defaults to T)
   * @param endpoint - Name of the endpoint to search
   * @param parameters - Search parameters including pagination, filtering, and sorting
   * @returns Observable of search results with metadata
   * @throws Error if endpoint is not configured
   *
   * @example
   * ```typescript
   * interface User { id: string; name: string; }
   *
   * api.search<User>('users', {
   *   page: 1,
   *   limit: 10,
   *   search: 'john',
   *   sort: [{ field: 'name', direction: 'asc' }]
   * }).subscribe(response => {
   *   console.log(response.data); // Array of users
   *   console.log(response.total); // Total count
   * });
   * ```
   */
  search<T, G = T>(
    endpoint: string,
    parameters?: ApiSearchParameters
  ): Observable<ApiSearchResponse<T, G>> {
    const endpointConfig = this.getEndpointConfig(endpoint);
    const params = this.buildHttpParams(parameters);

    return this.http
               .get<any>(this.getUrl(endpointConfig.path), { params })
               .pipe(
                 map(response => new ApiSearchResponse<T, G>({
                   data: response.data || [],
                   total: response.total,
                   page: parameters?.page || 1,
                   limit: parameters?.limit || 10,
                   groups: response.groups,
                   sort: response.sort,
                   statusCode: response.metadata?.statusCode || 200,
                   message: response.metadata?.message
                 })),
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 retry({ count: endpointConfig.retries || this.defaultRetries, delay: 1000 }),
                 catchError(this.handleError)
               );
  }

  /**
   * Retrieves a single resource by ID.
   *
   * @template T - Type of the resource
   * @param endpoint - Name of the endpoint
   * @param id - Unique identifier of the resource
   * @returns Observable of the resource with metadata
   * @throws Error if endpoint is not configured or resource is not found
   *
   * @example
   * ```typescript
   * interface User { id: string; name: string; }
   *
   * api.read<User>('users', '123').subscribe(
   *   response => console.log(response.data) // Single user
   * );
   * ```
   */
  read<T>(endpoint: string, id: string): Observable<ApiResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .get<any>(`${this.getUrl(endpointConfig.path)}/${id}`)
               .pipe(
                 map(response => new ApiResponse({
                   data: response.data,
                   statusCode: response.metadata.statusCode,
                   message: response.metadata.message
                 })),
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 retry({ count: endpointConfig.retries || this.defaultRetries, delay: 1000 }),
                 catchError(this.handleError)
               );
  }

  /**
   * Creates a new resource.
   *
   * @template T - Type of the resource
   * @param endpoint - Name of the endpoint
   * @param data - Resource data to create
   * @returns Observable of the created resource with metadata
   * @throws Error if endpoint is not configured or creation fails
   *
   * @example
   * ```typescript
   * interface User { id: string; name: string; }
   *
   * api.create<User>('users', { name: 'John Doe' }).subscribe(
   *   response => console.log(response.data) // Created user
   * );
   * ```
   */
  create<T>(endpoint: string, data: Partial<T>): Observable<ApiResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .post<any>(this.getUrl(endpointConfig.path), data)
               .pipe(
                 map(response => new ApiResponse({
                   data: response.data,
                   statusCode: response.metadata.statusCode,
                   message: response.metadata.message
                 })),
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 catchError(this.handleError)
               );
  }

  /**
   * Updates an existing resource.
   *
   * @template T - Type of the resource
   * @param endpoint - Name of the endpoint
   * @param id - Unique identifier of the resource to update
   * @param data - Resource data to update
   * @returns Observable of the updated resource with metadata
   * @throws Error if endpoint is not configured or update fails
   *
   * @example
   * ```typescript
   * interface User { id: string; name: string; }
   *
   * api.update<User>('users', '123', { name: 'Jane Doe' }).subscribe(
   *   response => console.log(response.data) // Updated user
   * );
   * ```
   */
  update<T>(
    endpoint: string,
    id: string,
    data: Partial<T>
  ): Observable<ApiResponse<T>> {
    const endpointConfig = this.getEndpointConfig(endpoint);

    return this.http
               .patch<any>(`${this.getUrl(endpointConfig.path)}/${id}`, data)
               .pipe(
                 map(response => new ApiResponse({
                   data: response.data,
                   statusCode: response.metadata?.statusCode || 200,
                   message: response.metadata?.message || 'Resource updated successfully'
                 })),
                 timeout(endpointConfig.timeout || this.defaultTimeout),
                 catchError(this.handleError)
               );
  }

  /**
   * Removes a resource.
   *
   * @param endpoint - Name of the endpoint
   * @param id - Unique identifier of the resource to remove
   * @returns Observable that completes when the resource is removed
   * @throws Error if endpoint is not configured or removal fails
   *
   * @example
   * ```typescript
   * api.remove('users', '123').subscribe(
   *   () => console.log('User deleted successfully')
   * );
   * ```
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
