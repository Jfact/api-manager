import {ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideHttpClient, withInterceptorsFromDi} from "@angular/common/http";
import {ApiConfig} from "./api/api";
import {HTTP_INTERCEPTORS_PROVIDER} from "./api/api.config";

export const appConfig: ApplicationConfig & { api: ApiConfig } = {
  api: {
    baseUrl: 'http://localhost:5001/api',
    endpoints: {
      clients: {path: 'clients'},
      clientSessions: {path: 'client-sessions'},
      databases: {path: 'databases'},
      tables: {path: 'tables'},
      columns: {path: 'columns'},
      inputs: {path: 'inputs'},
    }
  },
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
    ),
    provideAnimationsAsync(),
    HTTP_INTERCEPTORS_PROVIDER
  ]
};
