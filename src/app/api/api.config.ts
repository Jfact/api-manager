// api-config.token.ts
import { InjectionToken } from '@angular/core';
import { ApiConfig } from './api';

/**
 * Injection token for providing the API configuration.
 *
 * This token allows you to inject custom configuration settings for the API into Angular services or components.
 * The configuration must adhere to the `ApiConfig` interface.
 */
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

// src/app/core/interceptors/index.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ApiInterceptor } from './api.interceptor';

export const HTTP_INTERCEPTORS_PROVIDER = [
  { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true }
];
