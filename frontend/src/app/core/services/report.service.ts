import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  BardanaBalance,
  CashFlowReport,
  PartyLedgerSummary,
  PurchaseSaleReport,
  Stock
} from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private base = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  cashFlow(from: string, to: string): Observable<ApiResponse<CashFlowReport>> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<CashFlowReport>>(`${this.base}/cash-flow`, { params });
  }

  purchaseSale(from: string, to: string): Observable<ApiResponse<PurchaseSaleReport>> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<PurchaseSaleReport>>(`${this.base}/purchase-sale`, { params });
  }

  stock(): Observable<ApiResponse<Stock[]>> {
    return this.http.get<ApiResponse<Stock[]>>(`${this.base}/stock`);
  }

  bardanaBalance(partyId?: number): Observable<ApiResponse<BardanaBalance[]>> {
    let params = new HttpParams();
    if (partyId != null) params = params.set('partyId', partyId);
    return this.http.get<ApiResponse<BardanaBalance[]>>(`${this.base}/bardana-balance`, { params });
  }

  ledger(partyId: number): Observable<ApiResponse<PartyLedgerSummary>> {
    return this.http.get<ApiResponse<PartyLedgerSummary>>(`${this.base}/ledger/${partyId}`);
  }
}
