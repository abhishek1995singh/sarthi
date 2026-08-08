import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Purchase, PurchaseRequest } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private base = `${environment.apiUrl}/purchase`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Purchase[]>> {
    return this.http.get<ApiResponse<Purchase[]>>(this.base);
  }

  getById(id: number): Observable<ApiResponse<Purchase>> {
    return this.http.get<ApiResponse<Purchase>>(`${this.base}/${id}`);
  }

  create(purchase: PurchaseRequest): Observable<ApiResponse<Purchase>> {
    return this.http.post<ApiResponse<Purchase>>(this.base, purchase);
  }

  update(id: number, purchase: PurchaseRequest): Observable<ApiResponse<Purchase>> {
    return this.http.put<ApiResponse<Purchase>>(`${this.base}/${id}`, purchase);
  }

  confirm(id: number): Observable<ApiResponse<Purchase>> {
    return this.http.post<ApiResponse<Purchase>>(`${this.base}/${id}/confirm`, {});
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
