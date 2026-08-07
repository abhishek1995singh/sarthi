import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ApiResponse, AuthResponse } from '../models/models';
import { environment } from '../../../environments/environment';
import { I18nService } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { ThemeId } from '../theme/themes';
import { LocaleCode } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'sarthi_token';
  private readonly USER_KEY  = 'sarthi_user';

  private currentUserSubject = new BehaviorSubject<AuthResponse | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private i18n: I18nService,
    private theme: ThemeService
  ) {
    const user = this.currentUserSubject.value;
    if (user) {
      this.applyPreferences(user.preferredLocale, user.preferredTheme);
    }
  }

  login(username: string, password: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${environment.apiUrl}/auth/login`, { username, password }
    ).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem(this.TOKEN_KEY, res.data.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
          this.currentUserSubject.next(res.data);
          this.applyPreferences(res.data.preferredLocale, res.data.preferredTheme);
        }
      })
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get currentUser(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  isOwner(): boolean {
    return this.currentUser?.role === 'OWNER';
  }

  patchLocalUser(partial: Partial<AuthResponse>): void {
    const current = this.currentUserSubject.value;
    if (!current) return;
    const next = { ...current, ...partial };
    localStorage.setItem(this.USER_KEY, JSON.stringify(next));
    this.currentUserSubject.next(next);
  }

  applyPreferences(locale?: string, themeId?: string): void {
    if (locale === 'en' || locale === 'hi') {
      this.i18n.setLocale(locale as LocaleCode);
    }
    if (themeId) {
      this.theme.setTheme(themeId as ThemeId);
    }
  }

  private loadUser(): AuthResponse | null {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }
}
