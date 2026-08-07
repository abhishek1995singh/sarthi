import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  BardanaBalance,
  BardanaTransaction,
  BardanaTransactionRequest
} from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BardanaService {
  private base = `${environment.apiUrl}/bardana`;

  constructor(private http: HttpClient) {}

  list(partyId?: number, from?: string, to?: string): Observable<ApiResponse<BardanaTransaction[]>> {
    let params = new HttpParams();
    if (partyId != null) params = params.set('partyId', partyId);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResponse<BardanaTransaction[]>>(this.base, { params });
  }

  balances(partyId?: number): Observable<ApiResponse<BardanaBalance[]>> {
    let params = new HttpParams();
    if (partyId != null) params = params.set('partyId', partyId);
    return this.http.get<ApiResponse<BardanaBalance[]>>(`${this.base}/balances`, { params });
  }

  create(body: BardanaTransactionRequest): Observable<ApiResponse<BardanaTransaction>> {
    return this.http.post<ApiResponse<BardanaTransaction>>(this.base, body);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
