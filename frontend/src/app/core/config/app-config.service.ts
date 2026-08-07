import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  async load(): Promise<void> {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.apiUrl) {
        environment.apiUrl = String(json.apiUrl).replace(/\/$/, '');
      }
    } catch {
      // Keep compile-time environment.apiUrl
    }
  }

  get apiUrl(): string {
    return environment.apiUrl;
  }
}
