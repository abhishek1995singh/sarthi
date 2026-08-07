import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Sale, SaleRequest } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SaleService {
  private base = `${environment.apiUrl}/sale`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(this.base);
  }

  getById(id: number): Observable<ApiResponse<Sale>> {
    return this.http.get<ApiResponse<Sale>>(`${this.base}/${id}`);
  }

  create(sale: SaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(this.base, sale);
  }

  update(id: number, sale: SaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.put<ApiResponse<Sale>>(`${this.base}/${id}`, sale);
  }

  confirm(id: number): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(`${this.base}/${id}/confirm`, {});
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
