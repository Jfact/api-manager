// api.request.ts
import { Injectable, Inject } from '@angular/core';
import { ApiConfig, ApiResponse, Api, ApiSearchParameters, ApiSearchResponse } from './api';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api.config';

/**
 * ApiRequest extends the base Api class to encapsulate API calls for a specific path.
 * It provides method overloads for commonly used HTTP operations (search, read, create, update, remove).
 */
export class ApiRequest extends Api {
  private readonly path: string;

  /**
   * Creates an instance of ApiRequest.
   *
   * @param path - The base path for this specific API request.
   * @param http - Angular HttpClient instance for HTTP operations.
   * @param config - Global API configuration injected via the `API_CONFIG` token.
   */
  constructor(
    path: string,
    http: HttpClient,
    @Inject(API_CONFIG) config: ApiConfig
  ) {
    super(http, config);
    this.path = path;
  }

  /**
   * Searches for resources.
   *
   * @template T - The type of the resource being searched.
   * @param endpoint - The endpoint name (optional).
   * @param parameters - Query parameters for the search (optional).
   * @returns An Observable of `ApiSearchResponse<T>`.
   */
  override search<T>(endpoint: string, parameters?: ApiSearchParameters): Observable<ApiSearchResponse<T>>;
  override search<T>(parameters?: ApiSearchParameters): Observable<ApiSearchResponse<T>>;
  override search<T>(endpointOrParams?: string | ApiSearchParameters, parameters?: ApiSearchParameters): Observable<ApiSearchResponse<T>> {
    if (typeof endpointOrParams === 'string') {
      return super.search<T>(this.path, parameters);
    }
    return super.search<T>(this.path, endpointOrParams);
  }

  /**
   * Reads a specific resource by ID.
   *
   * @template T - The type of the resource.
   * @param endpoint - The endpoint name (optional).
   * @param id - The ID of the resource.
   * @returns An Observable of `ApiResponse<T>`.
   */
  override read<T>(endpoint: string, id: string): Observable<ApiResponse<T>>;
  override read<T>(id: string): Observable<ApiResponse<T>>;
  override read<T>(endpointOrId: string, id?: string): Observable<ApiResponse<T>> {
    return super.read<T>(this.path, id ?? endpointOrId);
  }

  /**
   * Creates a new resource.
   *
   * @template T - The type of the resource.
   * @param endpoint - The endpoint name (optional).
   * @param data - Partial data for the new resource.
   * @returns An Observable of `ApiResponse<T>`.
   */
  override create<T>(endpoint: string, data: Partial<T>): Observable<ApiResponse<T>>;
  override create<T>(data: Partial<T>): Observable<ApiResponse<T>>;
  override create<T>(endpointOrData: string | Partial<T>, data?: Partial<T>): Observable<ApiResponse<T>> {
    if (typeof endpointOrData === 'string') {
      return super.create<T>(this.path, data!);
    }
    return super.create<T>(this.path, endpointOrData);
  }

  /**
   * Updates an existing resource by ID.
   *
   * @template T - The type of the resource.
   * @param endpoint - The endpoint name (optional).
   * @param id - The ID of the resource to update.
   * @param data - Partial data for the updated resource.
   * @returns An Observable of `ApiResponse<T>`.
   */
  override update<T>(endpoint: string, id: string, data: Partial<T>): Observable<ApiResponse<T>>;
  override update<T>(id: string, data: Partial<T>): Observable<ApiResponse<T>>;
  override update<T>(endpointOrId: string, idOrData: string | Partial<T>, data?: Partial<T>): Observable<ApiResponse<T>> {
    if (data) {
      return super.update<T>(this.path, idOrData as string, data);
    }
    return super.update<T>(this.path, endpointOrId, idOrData as Partial<T>);
  }

  /**
   * Removes a resource by ID.
   *
   * @param endpoint - The endpoint name (optional).
   * @param id - The ID of the resource to remove.
   * @returns An Observable of void.
   */
  override remove(endpoint: string, id: string): Observable<void>;
  override remove(id: string): Observable<void>;
  override remove(endpointOrId: string, id?: string): Observable<void> {
    return super.remove(this.path, id ?? endpointOrId);
  }
}
