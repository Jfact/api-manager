import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from "./api/api.service";
import { API_CONFIG } from "./api/api.config"; // Fix the import

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet
  ],
  template: `
    <h1>Welcome to {{title}}!</h1>
    <router-outlet />
  `,
  styles: [],
  providers: [
    ApiService, // Make sure ApiService is provided
    {
      provide: API_CONFIG,
      useValue: {
        baseUrl: 'http://localhost:5001/api',
        endpoints: {
          databases: { path: 'databases' },
          tables: { path: 'tables' }
        },
        defaultTimeout: 5000,
        defaultRetries: 2
      }
    }
  ]
})
export class AppComponent {
  title = 'db-manager-1';

  constructor(private api: ApiService) {
    const databases = this.api.add('databases');

    databases.search<any>().subscribe({  // Add type parameter and proper error handling
      next: (response) => console.log('Databases:', response),
      error: (error) => console.error('Error fetching databases:', error)
    });
  }
}
