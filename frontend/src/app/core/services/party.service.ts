import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Party } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PartyService {
  private base = `${environment.apiUrl}/masters/parties`;

  constructor(private http: HttpClient) {}

  getAll(type?: string): Observable<ApiResponse<Party[]>> {
    const url = type ? `${this.base}?type=${type}` : this.base;
    return this.http.get<ApiResponse<Party[]>>(url);
  }

  getById(id: number): Observable<ApiResponse<Party>> {
    return this.http.get<ApiResponse<Party>>(`${this.base}/${id}`);
  }

  create(party: Partial<Party>): Observable<ApiResponse<Party>> {
    return this.http.post<ApiResponse<Party>>(this.base, party);
  }

  update(id: number, party: Partial<Party>): Observable<ApiResponse<Party>> {
    return this.http.put<ApiResponse<Party>>(`${this.base}/${id}`, party);
  }

  deactivate(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
