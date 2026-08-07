import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PartyLedgerSummary } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private base = `${environment.apiUrl}/ledger`;

  constructor(private http: HttpClient) {}

  getAllSummaries(): Observable<ApiResponse<PartyLedgerSummary[]>> {
    return this.http.get<ApiResponse<PartyLedgerSummary[]>>(this.base);
  }

  getPartyLedger(partyId: number): Observable<ApiResponse<PartyLedgerSummary>> {
    return this.http.get<ApiResponse<PartyLedgerSummary>>(`${this.base}/parties/${partyId}`);
  }

  getOutstanding(partyId: number): Observable<ApiResponse<{ outstanding: number }>> {
    return this.http.get<ApiResponse<{ outstanding: number }>>(`${this.base}/parties/${partyId}/outstanding`);
  }
}
