// api.service.ts
import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiRequest } from './api.request';
import { ApiConfig } from './api';
import { API_CONFIG } from './api.config';

/**
 * Service for managing and creating API request instances.
 *
 * This service provides a factory method for generating `ApiRequest` instances,
 * which can be used to interact with various API endpoints.
 * The service injects a global API configuration and HttpClient for making HTTP requests.
 *
 * @class ApiService
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  /**
   * Creates an instance of the ApiService.
   *
   * @param http - Angular HttpClient instance for performing HTTP operations.
   * @param config - Global API configuration injected via the `API_CONFIG` token.
   * This configuration may include base URL, timeout, and retry settings.
   */
  constructor(
    private http: HttpClient,
    @Inject(API_CONFIG) private config: ApiConfig
  ) {}

  /**
   * Creates a new `ApiRequest` instance configured with the given API path.
   * The path should be relative to the base API URL defined in the global configuration.
   *
   * @param path - The base path for the API endpoint (relative to the configured base URL).
   * @returns A new `ApiRequest` instance configured for the specified path,
   *          ready for performing API interactions.
   */
  add(path: string): ApiRequest {
    return new ApiRequest(path, this.http, this.config);
  }
}
