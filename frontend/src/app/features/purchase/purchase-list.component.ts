import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PurchaseService } from '../../core/services/purchase.service';
import { PartyService } from '../../core/services/party.service';
import { CommodityService } from '../../core/services/commodity.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { Purchase, Party, Commodity, CommodityVariety, CommoditySettings } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, MatMenuModule,
    MatSnackBarModule, StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="purchase-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'purchase.title' | t }}</h1>
          <p class="page-subtitle">{{ 'purchase.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" (click)="openForm()" id="btn-add-purchase">
          <mat-icon>add_shopping_cart</mat-icon>
          {{ 'purchase.record' | t }}
        </button>
      </div>

      <!-- Filters & Stats -->
      <div class="card mb-lg filters-container">
        <div class="filter-row">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" [placeholder]="'action.search' | t" (keyup)="onSearch($event)" id="search-purchase">
          </div>
          <div class="filter-actions">
            <button class="chip" [class.active]="filterStatus === ''" (click)="setFilterStatus('')">{{ 'filter.allStatus' | t }}</button>
            <button class="chip" [class.active]="filterStatus === 'UNPAID'" (click)="setFilterStatus('UNPAID')">{{ 'status.UNPAID' | t }}</button>
            <button class="chip" [class.active]="filterStatus === 'PARTIALLY_PAID'" (click)="setFilterStatus('PARTIALLY_PAID')">{{ 'status.PARTIALLY_PAID' | t }}</button>
            <button class="chip" [class.active]="filterStatus === 'PAID'" (click)="setFilterStatus('PAID')">{{ 'status.PAID' | t }}</button>
          </div>
        </div>
      </div>

      <!-- Purchase Table -->
      <div class="card">
        <div *ngIf="loading" class="loading-state">
          <mat-icon class="spin">autorenew</mat-icon>
          Loading purchases...
        </div>

        <div class="table-scroll" *ngIf="!loading">
          <table mat-table [dataSource]="filteredPurchases" class="purchase-table">
            
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let p">{{ p.purchaseDate | date:'dd MMM yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="party">
              <th mat-header-cell *matHeaderCellDef>Aadhti (Supplier)</th>
              <td mat-cell *matCellDef="let p">
                <div class="party-name">{{ p.partyName }}</div>
                <div class="created-by">Recorded by: {{ p.createdByFullName }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="commodity">
              <th mat-header-cell *matHeaderCellDef>Commodity & Variety</th>
              <td mat-cell *matCellDef="let p">
                <span class="variety-lbl">{{ p.commodityVarietyName }}</span>
                <span class="commodity-lbl">{{ p.commodityName }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef>Weight / Bags</th>
              <td mat-cell *matCellDef="let p">
                <div class="weight-value">{{ p.weightQuintals | number:'1.3-3' }} qtl</div>
                <div class="bags-value">{{ p.bags }} bags</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="rate">
              <th mat-header-cell *matHeaderCellDef>Rate (₹/qtl)</th>
              <td mat-cell *matCellDef="let p">₹{{ p.ratePerQuintal | number:'1.2-2' }}</td>
            </ng-container>

            <ng-container matColumnDef="netPayable">
              <th mat-header-cell *matHeaderCellDef>Net Payable</th>
              <td mat-cell *matCellDef="let p">
                <div class="net-payable-amt">₹{{ p.netPayable | number:'1.2-2' }}</div>
                <div class="amount-paid-amt" *ngIf="p.amountPaid > 0">Paid: ₹{{ p.amountPaid | number:'1.2-2' }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Payment Status</th>
              <td mat-cell *matCellDef="let p">
                <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
              </td>
            </ng-container>

            <ng-container matColumnDef="confirmed">
              <th mat-header-cell *matHeaderCellDef>Confirmed</th>
              <td mat-cell *matCellDef="let p">
                <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button [matMenuTriggerFor]="menu" [attr.id]="'purchase-action-' + p.id">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item *ngIf="!p.confirmed" (click)="confirmPurchase(p)">
                    <mat-icon color="primary">done</mat-icon><span>Confirm & Add Stock</span>
                  </button>
                  <button mat-menu-item *ngIf="!p.confirmed" (click)="deletePurchase(p)" class="text-danger">
                    <mat-icon color="warn">delete_outline</mat-icon><span>Delete Draft</span>
                  </button>
                  <button mat-menu-item *ngIf="p.confirmed && p.paymentStatus !== 'PAID'" (click)="openPayForm(p)">
                    <mat-icon>payments</mat-icon><span>Record Payment</span>
                  </button>
                  <button mat-menu-item *ngIf="p.confirmed && p.paymentStatus === 'PAID'" disabled>
                    <mat-icon>check_circle</mat-icon><span>Fully Paid</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr *matNoDataRow class="mat-row">
              <td class="no-data" [attr.colspan]="displayedColumns.length">
                <mat-icon>shopping_bag</mat-icon>
                <p>No purchase records found. Record your first purchase using the button above.</p>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Add Purchase Overlay Form -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card purchase-dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Record Purchase Invoice</h3>
            <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="purchaseForm" (ngSubmit)="savePurchase()" class="purchase-form">
            
            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Invoice Date *</mat-label>
                <input matInput type="date" formControlName="purchaseDate" id="purchase-date">
                <mat-error>Date is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Aadhti (Supplier) *</mat-label>
                <mat-select formControlName="partyId" id="purchase-party">
                  <mat-option *ngFor="let party of suppliers" [value]="party.id">
                    {{ party.name }}
                  </mat-option>
                </mat-select>
                <mat-error>Supplier is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Commodity *</mat-label>
                <mat-select formControlName="commodityId" (selectionChange)="onCommodityChange()" id="purchase-commodity">
                  <mat-option *ngFor="let c of commodities" [value]="c.id">
                    {{ c.name }}
                  </mat-option>
                </mat-select>
                <mat-error>Commodity is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Variety *</mat-label>
                <mat-select formControlName="commodityVarietyId" (selectionChange)="onVarietyChange()" id="purchase-variety">
                  <mat-option *ngFor="let v of varieties" [value]="v.id">
                    {{ v.name }}
                  </mat-option>
                </mat-select>
                <mat-error>Variety is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Weight (Quintals) *</mat-label>
                <input matInput type="number" formControlName="weightQuintals" (input)="recalculateBill()" id="purchase-weight" step="0.001" placeholder="0.000">
                <mat-error>Weight is required and must be positive</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Rate (₹ per Quintal) *</mat-label>
                <input matInput type="number" formControlName="ratePerQuintal" (input)="recalculateBill()" id="purchase-rate" step="0.01" placeholder="0.00">
                <mat-error>Rate is required and must be positive</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Bags Count (Optional)</mat-label>
                <input matInput type="number" formControlName="bags" id="purchase-bags" placeholder="Auto-calculated if empty">
                <mat-hint>Calculated using bag weight setting</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Cash Discount %</mat-label>
                <mat-select formControlName="cashDiscountPct" (selectionChange)="recalculateBill()" id="purchase-cd">
                  <mat-option [value]="0">None (0%)</mat-option>
                  <mat-option *ngFor="let pct of allowedDiscounts" [value]="pct">
                    {{ pct }}%
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks / Notes</mat-label>
              <textarea matInput formControlName="remarks" id="purchase-remarks" rows="2"></textarea>
            </mat-form-field>

            <!-- Real-time Bill Calculations Preview -->
            <div class="billing-summary" *ngIf="billCalculated">
              <div class="billing-title">Calculated Invoice Summary</div>
              <div class="billing-grid">
                <div class="billing-item">
                  <span class="lbl">Gross Amount (Weight × Rate)</span>
                  <span class="val">₹{{ bill.grossAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item">
                  <span class="lbl">Gaushala Charge (₹{{ bill.gaushalaRate }}/qtl)</span>
                  <span class="val text-negative">- ₹{{ bill.gaushalaAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item">
                  <span class="lbl">Commission ({{ bill.commissionRate }}%)</span>
                  <span class="val text-negative">- ₹{{ bill.commissionAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item" *ngIf="bill.cashDiscountAmount > 0">
                  <span class="lbl">Cash Discount ({{ bill.cashDiscountPct }}%)</span>
                  <span class="val text-negative">- ₹{{ bill.cashDiscountAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item grand-total">
                  <span class="lbl">Net Payable to Aadhti</span>
                  <span class="val text-primary">₹{{ bill.netPayable | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="purchase-save"
                      [disabled]="purchaseForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving Draft...' : 'Record Purchase' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Pay against purchase -->
      <div class="dialog-overlay" *ngIf="showPayForm" (click)="closePayForm()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()" style="max-width:420px">
          <div class="dialog-header">
            <h3>Pay Purchase #{{ payingPurchase?.id }}</h3>
            <button mat-icon-button (click)="closePayForm()"><mat-icon>close</mat-icon></button>
          </div>
          <div style="padding:0 24px 8px;color:var(--color-text-secondary);font-size:13px" *ngIf="payingPurchase">
            {{ payingPurchase.partyName }} — Due
            <strong>₹{{ (payingPurchase.netPayable - payingPurchase.amountPaid) | number:'1.2-2' }}</strong>
          </div>
          <form [formGroup]="payForm" (ngSubmit)="savePayment()" style="padding:16px 24px 24px;display:flex;flex-direction:column;gap:4px">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Payment Date *</mat-label>
              <input matInput type="date" formControlName="entryDate" id="pay-date">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Amount (₹) *</mat-label>
              <input matInput type="number" formControlName="amount" id="pay-amount" step="0.01">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks</mat-label>
              <textarea matInput formControlName="remarks" rows="2"></textarea>
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closePayForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="payForm.invalid || paying">
                {{ paying ? 'Posting...' : 'Post Payment' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .purchase-page { max-width: 1400px; }

    .filters-container { padding: var(--space-md) var(--space-lg); }

    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-md);
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 6px 14px;
      width: 100%;
      max-width: 320px;
    }

    .search-box mat-icon { color: var(--color-text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search-box input {
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      width: 100%;
      font-size: 13px;
      outline: none;
    }

    .filter-actions { display: flex; gap: var(--space-sm); }

    .chip {
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .chip:hover { border-color: var(--color-primary); color: var(--color-primary-light); }
    .chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

    .purchase-table { width: 100%; }

    .party-name { font-weight: 600; color: var(--color-text-primary); }
    .created-by { font-size: 10px; color: var(--color-text-muted); margin-top: 2px; }

    .variety-lbl { display: block; font-weight: 500; color: var(--color-text-primary); }
    .commodity-lbl { font-size: 11px; color: var(--color-text-muted); }

    .weight-value { font-weight: 500; color: var(--color-text-primary); }
    .bags-value { font-size: 11px; color: var(--color-text-secondary); }

    .net-payable-amt { font-weight: 700; color: var(--color-text-primary); }
    .amount-paid-amt { font-size: 11px; color: var(--color-success); margin-top: 2px; }

    .status-confirmed { color: var(--color-success); display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-size: 12px; }
    .status-confirmed mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .status-pending { color: var(--color-text-muted); display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
    .status-pending mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .loading-state, .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-2xl);
      color: var(--color-text-muted);
      gap: var(--space-sm);
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .purchase-dialog { max-width: 680px; }

    .purchase-form { display: flex; flex-direction: column; gap: var(--space-md); }

    .billing-summary {
      background: var(--color-surface-raised);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--space-md) var(--space-lg);
      margin: var(--space-sm) 0;
    }

    .billing-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-md);
    }

    .billing-grid { display: flex; flex-direction: column; gap: 8px; }

    .billing-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .val { font-weight: 600; }
    .text-negative { color: var(--color-danger); }
    .text-primary { color: var(--color-primary-dark); }

    .grand-total {
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-sm);
      margin-top: var(--space-xs);
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .grand-total .val { font-size: 16px; }

    .dialog-actions {
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border-subtle);
    }

    @media (max-width: 640px) {
      .filters { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class PurchaseListComponent implements OnInit {
  displayedColumns = ['date', 'party', 'commodity', 'weight', 'rate', 'netPayable', 'status', 'confirmed', 'actions'];
  purchases: Purchase[] = [];
  filteredPurchases: Purchase[] = [];
  suppliers: Party[] = [];
  commodities: Commodity[] = [];
  varieties: CommodityVariety[] = [];
  selectedSettings: CommoditySettings | null = null;
  allowedDiscounts: number[] = [];

  loading = false;
  showForm = false;
  saving = false;
  showPayForm = false;
  paying = false;
  payingPurchase: Purchase | null = null;
  filterStatus = '';
  searchText = '';
  purchaseForm: FormGroup;
  payForm: FormGroup;

  billCalculated = false;
  bill = {
    grossAmount: 0,
    gaushalaRate: 0,
    gaushalaAmount: 0,
    commissionRate: 0,
    commissionAmount: 0,
    cashDiscountPct: 0,
    cashDiscountAmount: 0,
    netPayable: 0
  };

  constructor(
    private purchaseService: PurchaseService,
    private partyService: PartyService,
    private commodityService: CommodityService,
    private cashbookService: CashbookService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    this.purchaseForm = this.fb.group({
      purchaseDate: [todayStr, Validators.required],
      partyId: ['', Validators.required],
      commodityId: ['', Validators.required],
      commodityVarietyId: ['', Validators.required],
      weightQuintals: ['', [Validators.required, Validators.min(0.001)]],
      ratePerQuintal: ['', [Validators.required, Validators.min(0.01)]],
      bags: [''],
      cashDiscountPct: [0],
      remarks: ['']
    });
    this.payForm = this.fb.group({
      entryDate: [todayStr, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['']
    });
  }

  ngOnInit() {
    this.loadPurchases();
    this.loadSuppliers();
    this.loadCommodities();
  }

  loadPurchases() {
    this.loading = true;
    this.purchaseService.getAll().subscribe({
      next: res => {
        this.purchases = res.data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadSuppliers() {
    // Only load supplier (Aadhti) type parties
    this.partyService.getAll('AADHTI').subscribe({
      next: res => this.suppliers = res.data
    });
  }

  loadCommodities() {
    this.commodityService.getAll().subscribe({
      next: res => this.commodities = res.data
    });
  }

  onCommodityChange() {
    const commodityId = this.purchaseForm.get('commodityId')?.value;
    this.varieties = [];
    this.selectedSettings = null;
    this.allowedDiscounts = [];
    this.purchaseForm.patchValue({ commodityVarietyId: '', cashDiscountPct: 0 });
    this.billCalculated = false;

    if (commodityId) {
      this.commodityService.getVarieties(commodityId).subscribe({
        next: res => this.varieties = res.data
      });
    }
  }

  onVarietyChange() {
    const varietyId = this.purchaseForm.get('commodityVarietyId')?.value;
    this.selectedSettings = null;
    this.allowedDiscounts = [];
    this.purchaseForm.patchValue({ cashDiscountPct: 0 });
    this.billCalculated = false;

    if (varietyId) {
      this.commodityService.getSettings(varietyId).subscribe({
        next: res => {
          this.selectedSettings = res.data;
          this.allowedDiscounts = this.selectedSettings.allowedCashDiscounts || [];
          this.recalculateBill();
        }
      });
    }
  }

  recalculateBill() {
    const weight = Number(this.purchaseForm.get('weightQuintals')?.value || 0);
    const rate = Number(this.purchaseForm.get('ratePerQuintal')?.value || 0);
    const discountPct = Number(this.purchaseForm.get('cashDiscountPct')?.value || 0);

    if (weight > 0 && rate > 0 && this.selectedSettings) {
      const gross = weight * rate;
      const gaushala = weight * this.selectedSettings.gausharaRate;
      const commission = gross * (this.selectedSettings.commissionRate / 100);
      const discount = gross * (discountPct / 100);
      const net = gross - gaushala - commission - discount;

      this.bill = {
        grossAmount: Math.round(gross * 100) / 100,
        gaushalaRate: this.selectedSettings.gausharaRate,
        gaushalaAmount: Math.round(gaushala * 100) / 100,
        commissionRate: this.selectedSettings.commissionRate,
        commissionAmount: Math.round(commission * 100) / 100,
        cashDiscountPct: discountPct,
        cashDiscountAmount: Math.round(discount * 100) / 100,
        netPayable: Math.round(net * 100) / 100
      };
      this.billCalculated = true;

      // Auto-calculate bags based on bagWeightKg if empty
      const bagsInput = this.purchaseForm.get('bags')?.value;
      if (!bagsInput && this.selectedSettings.bagWeightKg > 0) {
        const weightKg = weight * 100;
        const autoBags = Math.round(weightKg / this.selectedSettings.bagWeightKg);
        this.purchaseForm.get('bags')?.setValue(autoBags, { emitEvent: false });
      }
    } else {
      this.billCalculated = false;
    }
  }

  applyFilters() {
    this.filteredPurchases = this.purchases.filter(p => {
      const matchStatus = this.filterStatus ? p.paymentStatus === this.filterStatus : true;
      const matchSearch = this.searchText
        ? p.partyName.toLowerCase().includes(this.searchText.toLowerCase())
        : true;
      return matchStatus && matchSearch;
    });
  }

  setFilterStatus(status: string) {
    this.filterStatus = status;
    this.applyFilters();
  }

  onSearch(event: any) {
    this.searchText = event.target.value;
    this.applyFilters();
  }

  openForm() {
    const todayStr = new Date().toISOString().split('T')[0];
    this.purchaseForm.reset({
      purchaseDate: todayStr,
      partyId: '',
      commodityId: '',
      commodityVarietyId: '',
      weightQuintals: '',
      ratePerQuintal: '',
      bags: '',
      cashDiscountPct: 0,
      remarks: ''
    });
    this.varieties = [];
    this.selectedSettings = null;
    this.allowedDiscounts = [];
    this.billCalculated = false;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  savePurchase() {
    if (this.purchaseForm.invalid) return;
    this.saving = true;
    const val = this.purchaseForm.value;

    const requestData = {
      purchaseDate: val.purchaseDate,
      partyId: Number(val.partyId),
      commodityVarietyId: Number(val.commodityVarietyId),
      weightQuintals: Number(val.weightQuintals),
      bags: val.bags ? Number(val.bags) : undefined,
      ratePerQuintal: Number(val.ratePerQuintal),
      cashDiscountPct: Number(val.cashDiscountPct || 0),
      remarks: val.remarks
    };

    this.purchaseService.create(requestData).subscribe({
      next: () => {
        this.snackBar.open('Purchase recorded as Draft successfully', 'Close', { duration: 3000, panelClass: 'snack-success' });
        this.saving = false;
        this.closeForm();
        this.loadPurchases();
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to record purchase', 'Close', { duration: 4000, panelClass: 'snack-error' });
        this.saving = false;
      }
    });
  }

  confirmPurchase(purchase: Purchase) {
    if (!confirm(`Are you sure you want to CONFIRM this purchase? This will update running stock level for '${purchase.commodityVarietyName}' by +${purchase.weightQuintals} qtl. Confirmed entries cannot be edited or deleted.`)) return;

    this.purchaseService.confirm(purchase.id).subscribe({
      next: () => {
        this.snackBar.open('Purchase confirmed & stock updated successfully', 'Close', { duration: 3000 });
        this.loadPurchases();
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to confirm purchase', 'Close', { duration: 4000 });
      }
    });
  }

  deletePurchase(purchase: Purchase) {
    if (!confirm(`Delete draft purchase transaction with Aadhti '${purchase.partyName}'?`)) return;

    this.purchaseService.delete(purchase.id).subscribe({
      next: () => {
        this.snackBar.open('Draft purchase deleted', 'Close', { duration: 2000 });
        this.loadPurchases();
      }
    });
  }

  openPayForm(purchase: Purchase) {
    const due = purchase.netPayable - purchase.amountPaid;
    this.payingPurchase = purchase;
    this.payForm.reset({
      entryDate: new Date().toISOString().split('T')[0],
      amount: Math.round(due * 100) / 100,
      remarks: `Payment against Purchase #${purchase.id}`
    });
    this.showPayForm = true;
  }

  closePayForm() {
    this.showPayForm = false;
    this.payingPurchase = null;
  }

  savePayment() {
    if (this.payForm.invalid || !this.payingPurchase) return;
    this.paying = true;
    const v = this.payForm.value;
    this.cashbookService.createEntry({
      entryDate: v.entryDate,
      type: 'PAYMENT',
      partyId: this.payingPurchase.partyId,
      linkedPurchaseId: this.payingPurchase.id,
      amount: Number(v.amount),
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.paying = false;
        this.closePayForm();
        this.snackBar.open('Payment posted to cash book & ledger', 'Close', { duration: 3000 });
        this.loadPurchases();
      },
      error: err => {
        this.paying = false;
        this.snackBar.open(err.error?.message || 'Failed to post payment', 'Close', { duration: 4000 });
      }
    });
  }
}
