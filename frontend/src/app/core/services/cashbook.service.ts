import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CashBookDay, CashBookEntry, CashBookEntryRequest, PageResult } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CashbookService {
  private base = `${environment.apiUrl}/cashbook`;

  constructor(private http: HttpClient) {}

  getDay(date?: string): Observable<ApiResponse<CashBookDay>> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<ApiResponse<CashBookDay>>(this.base, { params });
  }

  getAllEntries(page: number = 0, size: number = 20, fromDate?: string, toDate?: string): Observable<ApiResponse<PageResult<CashBookEntry>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }

    return this.http.get<ApiResponse<PageResult<CashBookEntry>>>(`${this.base}/entries`, { params });
  }

  createEntry(entry: CashBookEntryRequest): Observable<ApiResponse<CashBookEntry>> {
    return this.http.post<ApiResponse<CashBookEntry>>(`${this.base}/entries`, entry);
  }

  setOpeningBalance(date: string, openingBalance: number): Observable<ApiResponse<CashBookDay>> {
    return this.http.post<ApiResponse<CashBookDay>>(`${this.base}/opening-balance`, { date, openingBalance });
  }

  finalizeDay(date: string): Observable<ApiResponse<CashBookDay>> {
    return this.http.post<ApiResponse<CashBookDay>>(`${this.base}/finalize`, null, {
      params: new HttpParams().set('date', date)
    });
  }
}
