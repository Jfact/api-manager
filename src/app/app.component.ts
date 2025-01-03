// loading.handler.ts
import {Observable, catchError, finalize, map, of, tap, Subject, takeUntil} from 'rxjs';
import { ApiError } from './api/api.error';
import { HttpErrorResponse } from '@angular/common/http';
import {RouterOutlet} from "@angular/router";
import {Component, OnDestroy, OnInit} from "@angular/core";
import {JsonPipe, NgIf} from "@angular/common";
import {ApiService} from "./api/api.service";
import {APP_PROVIDERS} from "./app.providers";

export interface LoadingState<T> {
  loading: boolean;
  error?: ApiError;
  data?: T;
}

export function withLoading<T>(
  source: Observable<T>,
  initialState: LoadingState<T>
): Observable<LoadingState<T>> {
  return source.pipe(
    map(data => ({ loading: false, data })),
    catchError((error: HttpErrorResponse) =>
      of({ loading: false, error: ApiError.fromHttpError(error) })
    ),
    tap({
      subscribe: () => initialState.loading = true,
      finalize: () => initialState.loading = false
    })
  );
}

// app.component.ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, JsonPipe],
  template: `
    <h1>Welcome to {{title}}!</h1>
    <div *ngIf="state.loading">Loading...</div>
    <div *ngIf="state.error">Error: {{state.error.message}}</div>
    <div *ngIf="state.data">
      <pre>{{state.data | json}}</pre>
    </div>
    <router-outlet/>
  `,
  providers: APP_PROVIDERS,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'db-manager-1';
  state: LoadingState<any> = { loading: false };
  private destroy$ = new Subject<void>();

  constructor(private apiService: ApiService) {
    const [client, clientSessions, databases, tables] =
      [
        apiService.add('clients'),
        apiService.add('clientSessions'),
        apiService.add('databases'),
        apiService.add('tables'),
        apiService.add('columns'),
        apiService.add('inputs')
      ];

    client.search().subscribe((clients) => console.log({clients}));
    clientSessions.search().subscribe((clientSessions) => console.log({clientSessions}));
    databases.search().subscribe((databases) => console.log({databases}));
    tables.search().subscribe((tables) => console.log({tables}));
  }

  ngOnInit(): void {
    // withLoading(
    //   this.apiService.add('databases').search(),
    //   this.state
    // )
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(newState => this.state = newState);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
