import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, PageResult, PartyLedgerSummary } from '../models/models';
import { environment } from '../../../environments/environment';

export interface PartyLedgerPageParams {
  unpaidPage?: number;
  unpaidSize?: number;
  entryPage?: number;
  entrySize?: number;
}

@Injectable({ providedIn: 'root' })
export class LedgerService {
  private base = `${environment.apiUrl}/ledger`;

  constructor(private http: HttpClient) {}

  getAllSummaries(): Observable<ApiResponse<PartyLedgerSummary[]>> {
    return this.http.get<ApiResponse<PartyLedgerSummary[]>>(this.base).pipe(
      map(res => ({
        ...res,
        data: (res.data || []).map(s => this.normalizeSummary(s))
      }))
    );
  }

  getPartyLedger(partyId: number, page?: PartyLedgerPageParams): Observable<ApiResponse<PartyLedgerSummary>> {
    let params = new HttpParams();
    if (page) {
      if (page.unpaidPage != null) params = params.set('unpaidPage', page.unpaidPage);
      if (page.unpaidSize != null) params = params.set('unpaidSize', page.unpaidSize);
      if (page.entryPage != null) params = params.set('entryPage', page.entryPage);
      if (page.entrySize != null) params = params.set('entrySize', page.entrySize);
    }
    return this.http.get<ApiResponse<PartyLedgerSummary>>(`${this.base}/parties/${partyId}`, { params }).pipe(
      map(res => ({
        ...res,
        data: res.data ? this.normalizeSummary(res.data) : res.data
      }))
    );
  }

  getOutstanding(partyId: number): Observable<ApiResponse<{ outstanding: number }>> {
    return this.http.get<ApiResponse<{ outstanding: number }>>(`${this.base}/parties/${partyId}/outstanding`);
  }

  /** Supports both legacy array responses and new PageResult payloads. */
  normalizeSummary(raw: PartyLedgerSummary | any): PartyLedgerSummary {
    return {
      ...raw,
      unpaidPurchases: this.asPage(raw?.unpaidPurchases),
      entries: this.asPage(raw?.entries)
    };
  }

  private asPage<T>(value: PageResult<T> | T[] | null | undefined): PageResult<T> {
    if (!value) {
      return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 };
    }
    if (Array.isArray(value)) {
      const content = value;
      const size = content.length;
      return {
        content,
        page: 0,
        size,
        totalElements: size,
        totalPages: size ? 1 : 0
      };
    }
    const content = Array.isArray(value.content) ? value.content : [];
    const totalElements = Number(value.totalElements ?? content.length) || 0;
    return {
      content,
      page: Number(value.page ?? 0) || 0,
      size: Number(value.size ?? content.length) || 0,
      totalElements,
      totalPages: Number(value.totalPages ?? (totalElements ? 1 : 0)) || 0
    };
  }
}
