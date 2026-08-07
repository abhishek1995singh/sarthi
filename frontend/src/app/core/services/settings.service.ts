import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AuditPage, UserAccount, UserPreferences } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private http: HttpClient) {}

  getPreferences(): Observable<ApiResponse<UserPreferences>> {
    return this.http.get<ApiResponse<UserPreferences>>(`${environment.apiUrl}/me/preferences`);
  }

  savePreferences(prefs: UserPreferences): Observable<ApiResponse<UserPreferences>> {
    return this.http.put<ApiResponse<UserPreferences>>(`${environment.apiUrl}/me/preferences`, prefs);
  }

  listUsers(): Observable<ApiResponse<UserAccount[]>> {
    return this.http.get<ApiResponse<UserAccount[]>>(`${environment.apiUrl}/users`);
  }

  createUser(body: { username: string; fullName: string; role: string; password: string }): Observable<ApiResponse<UserAccount>> {
    return this.http.post<ApiResponse<UserAccount>>(`${environment.apiUrl}/users`, body);
  }

  updateUser(id: number, body: { fullName: string; role: string }): Observable<ApiResponse<UserAccount>> {
    return this.http.put<ApiResponse<UserAccount>>(`${environment.apiUrl}/users/${id}`, body);
  }

  disableUser(id: number): Observable<ApiResponse<UserAccount>> {
    return this.http.post<ApiResponse<UserAccount>>(`${environment.apiUrl}/users/${id}/disable`, {});
  }

  enableUser(id: number): Observable<ApiResponse<UserAccount>> {
    return this.http.post<ApiResponse<UserAccount>>(`${environment.apiUrl}/users/${id}/enable`, {});
  }

  resetPassword(id: number, newPassword: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${environment.apiUrl}/users/${id}/reset-password`, { newPassword });
  }

  searchAudit(filters: {
    from?: string;
    to?: string;
    entity?: string;
    action?: string;
    userId?: number;
    page?: number;
    size?: number;
  }): Observable<ApiResponse<AuditPage>> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.entity) params = params.set('entity', filters.entity);
    if (filters.action) params = params.set('action', filters.action);
    if (filters.userId != null) params = params.set('userId', filters.userId);
    params = params.set('page', String(filters.page ?? 0));
    params = params.set('size', String(filters.size ?? 50));
    return this.http.get<ApiResponse<AuditPage>>(`${environment.apiUrl}/audit`, { params });
  }
}
