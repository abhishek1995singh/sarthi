import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Stock } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StockService {
  private base = `${environment.apiUrl}/stock`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Stock[]>> {
    return this.http.get<ApiResponse<Stock[]>>(this.base);
  }

  getByVariety(varietyId: number): Observable<ApiResponse<Stock>> {
    return this.http.get<ApiResponse<Stock>>(`${this.base}/variety/${varietyId}`);
  }
}
