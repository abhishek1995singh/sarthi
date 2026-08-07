import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Commodity, CommodityVariety, CommoditySettings } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CommodityService {
  private base = `${environment.apiUrl}/masters/commodities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Commodity[]>> {
    return this.http.get<ApiResponse<Commodity[]>>(this.base);
  }

  create(name: string, hasVarieties: boolean): Observable<ApiResponse<Commodity>> {
    return this.http.post<ApiResponse<Commodity>>(this.base, { name, hasVarieties });
  }

  getVarieties(commodityId: number): Observable<ApiResponse<CommodityVariety[]>> {
    return this.http.get<ApiResponse<CommodityVariety[]>>(`${this.base}/${commodityId}/varieties`);
  }

  addVariety(commodityId: number, name: string): Observable<ApiResponse<CommodityVariety>> {
    return this.http.post<ApiResponse<CommodityVariety>>(`${this.base}/${commodityId}/varieties`, { name });
  }

  getSettings(varietyId: number): Observable<ApiResponse<CommoditySettings>> {
    return this.http.get<ApiResponse<CommoditySettings>>(`${this.base}/varieties/${varietyId}/settings`);
  }

  updateSettings(varietyId: number, settings: Partial<CommoditySettings>): Observable<ApiResponse<CommoditySettings>> {
    return this.http.put<ApiResponse<CommoditySettings>>(`${this.base}/varieties/${varietyId}/settings`, settings);
  }
}
