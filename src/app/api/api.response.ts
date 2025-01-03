/**
 * Base class for all API responses.
 * Provides structured format for API responses with metadata and data payload.
 */
export class ApiResponse<T> {
  /** The actual response payload */
  public readonly data: T;

  /** Response metadata containing timestamp, status, and optional message */
  public readonly metadata: {
    /** ISO timestamp of when the response was created */
    timestamp: string;
    /** HTTP status code */
    statusCode: number;
    /** Optional message */
    message?: string;
  };

  constructor(options: {
    data: T;
    statusCode: number;
    message?: string;
  }) {
    this.data = options.data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      statusCode: options.statusCode,
      message: options.message ?? ''
    };
  }
}

/**
 * Specialized API response class for search results with grouping support.
 * Extends the base ApiResponse with pagination metadata and grouping functionality.
 */
export class ApiSearchResponse<T, G = T> extends ApiResponse<T[]> {
  /** Pagination information */
  public readonly pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    pages: number;
  };

  /** Grouped results when grouping is requested */
  public readonly groups: G[];

  /** Applied sort criteria */
  public readonly sort: Array<{
    column: string;
    order: 'asc' | 'desc';
  }>;

  constructor(options: {
    data: T[];
    total: number;
    page: number;
    limit: number;
    groups?: G[];
    sort?: Array<{ column: string; order: 'asc' | 'desc' }>;
    statusCode?: number;
    message?: string;
  }) {
    super({
      data: options.data,
      statusCode: options.statusCode || 200,
      message: options.message
    });

    this.pagination = {
      total: options.total ?? 0,
      page: options.page,
      limit: options.limit,
      pages: Math.ceil(options.total > 0 ? (options.total / options.limit) : 0)
    };

    this.groups = options.groups || [];
    this.sort = options.sort || [];
  }
}
