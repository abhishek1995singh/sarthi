import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { CommodityService } from '../../../core/services/commodity.service';
import { StockService } from '../../../core/services/stock.service';
import { Commodity, CommodityVariety, Stock } from '../../../core/models/models';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-commodity-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatButtonModule, TranslatePipe
  ],
  template: `
    <div class="commodity-page" [class.show-detail]="isMobile && selectedCommodity">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'commodities.title' | t }}</h1>
          <p class="page-subtitle">{{ 'commodities.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary header-add" (click)="openCommodityForm()" id="btn-add-commodity-top">
          <mat-icon>add</mat-icon>
          <span>{{ 'action.add' | t }}</span>
        </button>
      </div>

      <div class="split-layout">
        <!-- LIST -->
        <div class="card left-panel list-pane">
          <div class="panel-header">
            <h3>All commodities</h3>
            <button class="btn btn-ghost btn-sm desktop-add" (click)="openCommodityForm()" id="btn-add-commodity">
              <mat-icon>add</mat-icon> Add
            </button>
          </div>

          <div *ngIf="loading" class="loading-state">
            <mat-icon class="spin">autorenew</mat-icon>
          </div>

          <div *ngIf="!loading" class="commodity-list">
            <button type="button"
                    *ngFor="let c of commodities"
                    class="commodity-item"
                    [class.active]="selectedCommodity?.id === c.id"
                    (click)="selectCommodity(c)"
                    [attr.id]="'commodity-item-' + c.id">
              <div class="commodity-avatar" aria-hidden="true">{{ c.name.charAt(0) }}</div>
              <div class="commodity-info">
                <span class="commodity-name">{{ c.name }}</span>
                <span class="variety-count">{{ c.varieties?.length || 0 }} varieties</span>
              </div>
              <mat-icon class="chevron">chevron_right</mat-icon>
            </button>

            <div *ngIf="commodities.length === 0" class="no-data-msg">
              No commodities yet. Tap Add to create one.
            </div>
          </div>
        </div>

        <!-- DETAIL -->
        <div class="card right-panel detail-pane" *ngIf="!isMobile || selectedCommodity">
          <div *ngIf="!selectedCommodity" class="empty-detail-state">
            <mat-icon>grain</mat-icon>
            <p>Select a commodity to manage varieties, rules, and stock.</p>
          </div>

          <div *ngIf="selectedCommodity" class="detail-body">
            <div class="commodity-detail-header">
              <button type="button" class="back-btn" (click)="clearSelection()" aria-label="Back to list">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="detail-title-block">
                <h2>{{ selectedCommodity.name }}</h2>
                <p>{{ selectedCommodity.varieties?.length || 0 }} varieties</p>
              </div>
              <button class="btn btn-primary btn-sm add-variety-btn" (click)="openVarietyForm()" id="btn-add-variety">
                <mat-icon>add</mat-icon>
                <span class="add-variety-label">Variety</span>
              </button>
            </div>

            <div class="tabs" role="tablist">
              <button type="button" class="tab-btn" role="tab"
                      [class.active]="activeTab === 'settings'"
                      (click)="activeTab = 'settings'">
                <mat-icon>tune</mat-icon> Rules
              </button>
              <button type="button" class="tab-btn" role="tab"
                      [class.active]="activeTab === 'stock'"
                      (click)="activeTab = 'stock'">
                <mat-icon>inventory_2</mat-icon> Stock
              </button>
            </div>

            <div class="tab-content" *ngIf="activeTab === 'settings'">
              <div class="variety-grid">
                <div *ngFor="let v of selectedCommodity.varieties" class="variety-card">
                  <div class="variety-header">
                    <h4>{{ v.name }}</h4>
                    <button type="button" class="btn btn-ghost btn-sm icon-btn"
                            (click)="editSettings(v)" [attr.id]="'edit-settings-' + v.id">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                  </div>

                  <div class="settings-summary" *ngIf="v.settings; else settingsLoading">
                    <div class="settings-row">
                      <span class="lbl">Commission</span>
                      <span class="val">{{ v.settings.commissionRate }}%</span>
                    </div>
                    <div class="settings-row">
                      <span class="lbl">Gaushala</span>
                      <span class="val">₹{{ v.settings.gausharaRate }}/qtl</span>
                    </div>
                    <div class="settings-row">
                      <span class="lbl">Bag weight</span>
                      <span class="val">{{ v.settings.bagWeightKg }} kg</span>
                    </div>
                    <div class="settings-row">
                      <span class="lbl">Discounts</span>
                      <span class="val csv">{{ formatDiscounts(v.settings.allowedCashDiscounts) }}</span>
                    </div>
                    <div class="settings-row">
                      <span class="lbl">Bardana</span>
                      <span class="val badge badge-info">{{ v.settings.bardanaMode }}</span>
                    </div>
                  </div>
                  <ng-template #settingsLoading>
                    <p class="settings-pending">Loading rules…</p>
                  </ng-template>
                </div>

                <div *ngIf="!selectedCommodity.varieties || selectedCommodity.varieties.length === 0" class="no-data-prompt">
                  <mat-icon>info</mat-icon>
                  <p>No varieties yet. Add one to set commission and stock rules.</p>
                </div>
              </div>
            </div>

            <div class="tab-content" *ngIf="activeTab === 'stock'">
              <!-- Desktop table -->
              <div class="stock-table-wrap desktop-stock">
                <div class="table-scroll">
                  <table class="stock-table">
                    <thead>
                      <tr>
                        <th>Variety</th>
                        <th>Bags</th>
                        <th>Weight (qtl)</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let v of selectedCommodity.varieties">
                        <td class="stock-variety-name">{{ v.name }}</td>
                        <td class="stock-bags">{{ getStockForVariety(v.id)?.bags || 0 }}</td>
                        <td class="stock-weight">
                          {{ getStockForVariety(v.id)?.quantityQuintals | number:'1.3-3' || '0.000' }}
                        </td>
                        <td class="stock-time">
                          {{ getStockForVariety(v.id)?.lastUpdated | date:'dd MMM, hh:mm a' || '—' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Mobile stock cards -->
              <div class="stock-cards mobile-stock">
                <div class="stock-card" *ngFor="let v of selectedCommodity.varieties">
                  <div class="stock-card-top">
                    <strong>{{ v.name }}</strong>
                    <span class="badge"
                          [class.badge-paid]="(getStockForVariety(v.id)?.quantityQuintals || 0) > 0"
                          [class.badge-unpaid]="(getStockForVariety(v.id)?.quantityQuintals || 0) === 0">
                      {{ getStockForVariety(v.id)?.quantityQuintals | number:'1.3-3' || '0.000' }} qtl
                    </span>
                  </div>
                  <div class="stock-card-meta">
                    <span>{{ getStockForVariety(v.id)?.bags || 0 }} bags</span>
                    <span>{{ getStockForVariety(v.id)?.lastUpdated | date:'dd MMM' || 'Never' }}</span>
                  </div>
                </div>
              </div>

              <div *ngIf="!selectedCommodity.varieties?.length" class="no-data-prompt">
                <mat-icon>inventory_2</mat-icon>
                <p>No stock rows until a variety exists.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ADD COMMODITY -->
      <div class="dialog-overlay" *ngIf="showCommodityForm" (click)="showCommodityForm = false">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Add commodity</h3>
            <button mat-icon-button type="button" (click)="showCommodityForm = false"><mat-icon>close</mat-icon></button>
          </div>
          <form [formGroup]="commodityForm" (ngSubmit)="saveCommodity()">
            <mat-form-field appearance="outline" class="w-full mb-md">
              <mat-label>Name *</mat-label>
              <input matInput formControlName="name" id="commodity-name" placeholder="e.g. Paddy, Wheat">
              <mat-error>Name is required</mat-error>
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="showCommodityForm = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="commodityForm.invalid">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ADD VARIETY -->
      <div class="dialog-overlay" *ngIf="showVarietyForm" (click)="showVarietyForm = false">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Add variety</h3>
            <button mat-icon-button type="button" (click)="showVarietyForm = false"><mat-icon>close</mat-icon></button>
          </div>
          <p class="dialog-context">{{ selectedCommodity?.name }}</p>
          <form [formGroup]="varietyForm" (ngSubmit)="saveVariety()">
            <mat-form-field appearance="outline" class="w-full mb-md">
              <mat-label>Variety name *</mat-label>
              <input matInput formControlName="name" id="variety-name" placeholder="e.g. 1509 Hand">
              <mat-error>Required</mat-error>
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="showVarietyForm = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="varietyForm.invalid">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- EDIT SETTINGS -->
      <div class="dialog-overlay" *ngIf="showSettingsForm" (click)="showSettingsForm = false">
        <div class="dialog-panel card" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Business rules</h3>
            <button mat-icon-button type="button" (click)="showSettingsForm = false"><mat-icon>close</mat-icon></button>
          </div>
          <p class="dialog-context">{{ editingVariety?.name }}</p>
          <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()" class="settings-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Commission % *</mat-label>
                <input matInput type="number" formControlName="commissionRate" id="settings-commission" step="0.01">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Gaushala ₹/qtl *</mat-label>
                <input matInput type="number" formControlName="gausharaRate" id="settings-gaushala" step="0.01">
              </mat-form-field>
            </div>
            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Bag weight (kg) *</mat-label>
                <input matInput type="number" formControlName="bagWeightKg" id="settings-bag-weight" step="0.01">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Bardana mode *</mat-label>
                <mat-select formControlName="bardanaMode" id="settings-bardana-mode">
                  <mat-option value="EXCHANGE">Exchange</mat-option>
                  <mat-option value="COST_INCLUDED">Cost included</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Cash discounts (CSV) *</mat-label>
                <input matInput formControlName="allowedCashDiscounts" id="settings-discounts" placeholder="0.5,1.0,1.5">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Sale tax % *</mat-label>
                <input matInput type="number" formControlName="saleTaxRate" id="settings-tax" step="0.01">
              </mat-form-field>
            </div>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="showSettingsForm = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="settingsForm.invalid" id="settings-save">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .commodity-page { max-width: 1400px; }

    .page-header { align-items: center; }
    .header-add { display: none; }
    .desktop-add { display: inline-flex; }

    .split-layout {
      display: grid;
      grid-template-columns: minmax(240px, 300px) 1fr;
      gap: var(--space-lg);
      align-items: start;
    }

    .left-panel { padding: 12px 0; }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 16px 10px;
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .panel-header h3 {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
    }

    .commodity-list { display: flex; flex-direction: column; padding: 8px; gap: 4px; }

    .commodity-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 56px;
      padding: 10px 12px;
      border: none;
      border-radius: 12px;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: inherit;
      font: inherit;
      transition: background 0.15s;
    }
    .commodity-item:hover { background: var(--color-surface-raised); }
    .commodity-item.active {
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
    }

    .commodity-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      display: grid;
      place-items: center;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      color: var(--color-text-secondary);
    }
    .commodity-item.active .commodity-avatar {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }

    .commodity-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .commodity-name { font-weight: 650; font-size: 14px; }
    .variety-count { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
    .chevron { color: var(--color-text-muted); font-size: 20px; width: 20px; height: 20px; }

    .right-panel { min-height: 420px; padding: 20px; }

    .empty-detail-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      color: var(--color-text-muted);
      text-align: center;
      gap: 12px;
      padding: 24px;
    }
    .empty-detail-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--color-border); }
    .empty-detail-state p { font-size: 13px; line-height: 1.55; max-width: 28ch; }

    .commodity-detail-header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 14px;
      margin-bottom: 12px;
    }

    .back-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface);
      color: var(--color-text-primary);
      cursor: pointer;
      flex-shrink: 0;
    }

    .detail-title-block { flex: 1; min-width: 0; }
    .detail-title-block h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .detail-title-block p {
      font-size: 12px;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .add-variety-btn { flex-shrink: 0; width: auto; }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border-subtle);
      border-radius: 12px;
      padding: 4px;
      margin-bottom: 16px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-radius: 9px;
      min-height: 40px;
      padding: 8px 10px;
      font-size: 13px;
      font-weight: 650;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .tab-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .tab-btn.active {
      background: var(--color-surface);
      color: var(--color-primary-dark);
      box-shadow: var(--shadow-sm);
    }

    .variety-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .variety-card {
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 14px;
    }
    .variety-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--color-border-subtle);
    }
    .variety-header h4 { margin: 0; font-size: 14px; font-weight: 700; }
    .icon-btn { width: auto; min-height: 36px; padding: 6px 10px; }

    .settings-summary { display: flex; flex-direction: column; gap: 8px; }
    .settings-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
    .settings-row .lbl { color: var(--color-text-muted); }
    .settings-row .val { font-weight: 650; color: var(--color-text-primary); text-align: right; }
    .settings-row .csv {
      font-size: 11px;
      color: var(--color-primary-dark);
      background: var(--color-primary-soft);
      padding: 2px 8px;
      border-radius: 999px;
    }
    .settings-pending { font-size: 12px; color: var(--color-text-muted); }

    .stock-table { width: 100%; border-collapse: collapse; text-align: left; }
    .stock-table th {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
      font-weight: 700; color: var(--color-text-muted);
      padding: 8px 12px; border-bottom: 1px solid var(--color-border);
    }
    .stock-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid var(--color-border-subtle); }
    .stock-variety-name { font-weight: 650; }
    .stock-bags { color: var(--color-text-secondary); }
    .stock-weight { font-weight: 700; }
    .stock-time { color: var(--color-text-muted); font-size: 12px; }

    .mobile-stock { display: none; }
    .stock-cards { display: flex; flex-direction: column; gap: 10px; }
    .stock-card {
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 14px;
      background: var(--color-surface-raised);
    }
    .stock-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .stock-card-meta {
      display: flex;
      justify-content: space-between;
      color: var(--color-text-muted);
      font-size: 12px;
    }

    .settings-form { display: flex; flex-direction: column; gap: 8px; }
    .dialog-context {
      margin: -8px 0 14px;
      color: var(--color-text-secondary);
      font-size: 13px;
      font-weight: 600;
    }

    .no-data-prompt {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 32px 16px; text-align: center; color: var(--color-text-muted); gap: 8px;
      grid-column: 1 / -1;
    }
    .no-data-prompt mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--color-border); }
    .no-data-prompt p { font-size: 13px; max-width: 28ch; }
    .no-data-msg { padding: 24px 16px; font-size: 13px; color: var(--color-text-muted); text-align: center; }

    .loading-state {
      display: flex; justify-content: center; padding: 32px; color: var(--color-text-muted);
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 900px) {
      .header-add { display: inline-flex; min-width: 44px; width: auto; padding: 0 14px; }
      .desktop-add { display: none; }

      .split-layout { grid-template-columns: 1fr; gap: 0; }
      .right-panel { min-height: auto; padding: 16px; }

      /* Drill-in: show one pane at a time */
      .detail-pane { display: none; }
      .commodity-page.show-detail .list-pane { display: none; }
      .commodity-page.show-detail .detail-pane { display: block; }

      .back-btn { display: inline-flex; }

      .empty-detail-state { display: none; }

      .variety-grid { grid-template-columns: 1fr; }

      .desktop-stock { display: none; }
      .mobile-stock { display: flex; }

      .page-subtitle { max-width: 34ch; }
      .add-variety-btn { min-height: 40px; }
    }
  `]
})
export class CommodityListComponent implements OnInit {
  commodities: Commodity[] = [];
  stocks: Stock[] = [];
  selectedCommodity: Commodity | null = null;
  activeTab = 'settings';
  loading = false;
  isMobile = false;

  showCommodityForm = false;
  commodityForm: FormGroup;

  showVarietyForm = false;
  varietyForm: FormGroup;

  showSettingsForm = false;
  editingVariety: CommodityVariety | null = null;
  settingsForm: FormGroup;

  constructor(
    private commodityService: CommodityService,
    private stockService: StockService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.commodityForm = this.fb.group({
      name: ['', Validators.required],
      hasVarieties: [true]
    });

    this.varietyForm = this.fb.group({
      name: ['', Validators.required]
    });

    this.settingsForm = this.fb.group({
      commissionRate: [1.5, [Validators.required, Validators.min(0)]],
      gausharaRate: [3.0, [Validators.required, Validators.min(0)]],
      bagWeightKg: [40, [Validators.required, Validators.min(0.1)]],
      bardanaMode: ['EXCHANGE', Validators.required],
      allowedCashDiscounts: ['0.5,1.0,1.5,2.0', Validators.required],
      saleTaxRate: [0.0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.checkViewport();
    this.loadCommodities();
    this.loadStocks();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkViewport();
  }

  private checkViewport() {
    this.isMobile = window.innerWidth <= 900;
  }

  loadCommodities() {
    this.loading = true;
    this.commodityService.getAll().subscribe({
      next: res => {
        this.commodities = res.data ?? [];
        this.loading = false;
        if (this.selectedCommodity) {
          const matched = this.commodities.find(c => c.id === this.selectedCommodity!.id);
          if (matched) {
            this.selectedCommodity = {
              ...matched,
              varieties: this.selectedCommodity.varieties
            };
          }
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Could not load commodities', 'Close', { duration: 3000 });
      }
    });
  }

  loadStocks() {
    this.stockService.getAll().subscribe({
      next: res => this.stocks = res.data ?? [],
      error: () => this.stocks = []
    });
  }

  selectCommodity(c: Commodity) {
    this.selectedCommodity = c;
    this.activeTab = 'settings';
    this.loadCommodityDetails(c.id);
  }

  clearSelection() {
    this.selectedCommodity = null;
  }

  loadCommodityDetails(commodityId: number) {
    this.commodityService.getVarieties(commodityId).subscribe({
      next: res => {
        if (this.selectedCommodity?.id !== commodityId) return;
        this.selectedCommodity = {
          ...this.selectedCommodity,
          varieties: res.data ?? []
        };
        this.selectedCommodity.varieties!.forEach(v => {
          this.commodityService.getSettings(v.id).subscribe({
            next: sRes => {
              if (!this.selectedCommodity?.varieties) return;
              const target = this.selectedCommodity.varieties.find(x => x.id === v.id);
              if (target) target.settings = sRes.data;
            }
          });
        });
      }
    });
  }

  getStockForVariety(varietyId: number): Stock | undefined {
    return this.stocks.find(s => s.commodityVarietyId === varietyId);
  }

  formatDiscounts(value: number[] | string | undefined): string {
    if (Array.isArray(value)) return value.join(', ');
    return value || '—';
  }

  openCommodityForm() {
    this.commodityForm.reset({ name: '', hasVarieties: true });
    this.showCommodityForm = true;
  }

  saveCommodity() {
    if (this.commodityForm.invalid) return;
    const { name, hasVarieties } = this.commodityForm.value;
    this.commodityService.create(name, hasVarieties).subscribe({
      next: () => {
        this.snackBar.open('Commodity created', 'Close', { duration: 2500 });
        this.showCommodityForm = false;
        this.loadCommodities();
      },
      error: () => this.snackBar.open('Could not create commodity', 'Close', { duration: 3000 })
    });
  }

  openVarietyForm() {
    this.varietyForm.reset({ name: '' });
    this.showVarietyForm = true;
  }

  saveVariety() {
    if (this.varietyForm.invalid || !this.selectedCommodity) return;
    const name = this.varietyForm.value.name;
    this.commodityService.addVariety(this.selectedCommodity.id, name).subscribe({
      next: () => {
        this.snackBar.open('Variety added', 'Close', { duration: 2500 });
        this.showVarietyForm = false;
        this.loadCommodityDetails(this.selectedCommodity!.id);
        this.loadCommodities();
        this.loadStocks();
      },
      error: () => this.snackBar.open('Could not add variety', 'Close', { duration: 3000 })
    });
  }

  editSettings(variety: CommodityVariety) {
    this.editingVariety = variety;
    if (variety.settings) {
      this.settingsForm.patchValue({
        commissionRate: variety.settings.commissionRate,
        gausharaRate: variety.settings.gausharaRate,
        bagWeightKg: variety.settings.bagWeightKg,
        bardanaMode: variety.settings.bardanaMode,
        allowedCashDiscounts: Array.isArray(variety.settings.allowedCashDiscounts)
          ? variety.settings.allowedCashDiscounts.join(',')
          : variety.settings.allowedCashDiscounts || '0.5,1.0,1.5,2.0',
        saleTaxRate: variety.settings.saleTaxRate
      });
    } else {
      this.settingsForm.reset({
        commissionRate: 1.5,
        gausharaRate: 3.0,
        bagWeightKg: 40,
        bardanaMode: 'EXCHANGE',
        allowedCashDiscounts: '0.5,1.0,1.5,2.0',
        saleTaxRate: 0.0
      });
    }
    this.showSettingsForm = true;
  }

  saveSettings() {
    if (this.settingsForm.invalid || !this.editingVariety || !this.selectedCommodity) return;
    const rawVal = this.settingsForm.value;

    const discountsArr = String(rawVal.allowedCashDiscounts)
      .split(',')
      .map((x: string) => x.trim())
      .filter((x: string) => x !== '')
      .map(Number);

    const updateData = {
      ...rawVal,
      allowedCashDiscounts: discountsArr
    };

    this.commodityService.updateSettings(this.editingVariety.id, updateData).subscribe({
      next: () => {
        this.snackBar.open('Rules updated', 'Close', { duration: 2500 });
        this.showSettingsForm = false;
        this.loadCommodityDetails(this.selectedCommodity!.id);
      },
      error: () => this.snackBar.open('Could not update rules', 'Close', { duration: 3000 })
    });
  }
}
