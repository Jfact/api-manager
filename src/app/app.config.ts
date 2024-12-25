import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {provideHttpClient, withInterceptorsFromDi} from "@angular/common/http";
import {ApiConfig} from "./api/api";

export const appConfig: ApplicationConfig & { api: ApiConfig } = {
  api: {
    baseUrl: 'http://localhost:5001/api',
    endpoints: {
      databases: {path: 'databases'},
      tables: {path: 'tables'}
    }
  },
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
    ),
    provideAnimationsAsync(),
    // {provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true}
  ]
};
