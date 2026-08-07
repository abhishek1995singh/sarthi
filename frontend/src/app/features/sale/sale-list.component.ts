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
import { SaleService } from '../../core/services/sale.service';
import { PartyService } from '../../core/services/party.service';
import { CommodityService } from '../../core/services/commodity.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { Sale, Party, Commodity, CommodityVariety } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-sale-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, MatMenuModule,
    MatSnackBarModule, StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="sale-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'sale.title' | t }}</h1>
          <p class="page-subtitle">{{ 'sale.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openForm()" id="btn-add-sale">
          <mat-icon>point_of_sale</mat-icon>
          {{ 'sale.record' | t }}
        </button>
      </div>

      <div class="card mb-lg filters-container">
        <div class="filter-row">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input type="text" [placeholder]="'action.search' | t" (keyup)="onSearch($event)" id="search-sale">
          </div>
          <div class="filter-actions">
            <button type="button" class="chip" [class.active]="filterStatus === ''" (click)="setFilterStatus('')">{{ 'filter.all' | t }}</button>
            <button type="button" class="chip" [class.active]="filterStatus === 'UNPAID'" (click)="setFilterStatus('UNPAID')">{{ 'status.UNPAID' | t }}</button>
            <button type="button" class="chip" [class.active]="filterStatus === 'PARTIALLY_PAID'" (click)="setFilterStatus('PARTIALLY_PAID')">{{ 'status.PARTIALLY_PAID' | t }}</button>
            <button type="button" class="chip" [class.active]="filterStatus === 'PAID'" (click)="setFilterStatus('PAID')">{{ 'status.PAID' | t }}</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div *ngIf="loading" class="loading-state">
          <mat-icon class="spin">autorenew</mat-icon>
          Loading sales...
        </div>

        <div class="table-scroll" *ngIf="!loading">
          <table mat-table [dataSource]="filteredSales" class="sale-table">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let s">{{ s.saleDate | date:'dd MMM yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="buyer">
              <th mat-header-cell *matHeaderCellDef>Buyer</th>
              <td mat-cell *matCellDef="let s">
                <div class="party-name">{{ s.buyerName }}</div>
                <div class="meta">{{ s.saleType === 'FOB' ? 'FOB' : 'Rate-based' }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="commodity">
              <th mat-header-cell *matHeaderCellDef>Commodity</th>
              <td mat-cell *matCellDef="let s">
                <div class="variety-lbl">{{ s.commodityVarietyName }}</div>
                <div class="meta">{{ s.commodityName }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="qty">
              <th mat-header-cell *matHeaderCellDef>Qty / Bags</th>
              <td mat-cell *matCellDef="let s">
                <div>{{ s.quantityQuintals | number:'1.3-3' }} qtl</div>
                <div class="meta">{{ s.bags }} bags</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let s">
                <div class="amount">₹{{ s.totalAmount | number:'1.2-2' }}</div>
                <div class="meta" *ngIf="s.amountReceived > 0">Recv: ₹{{ s.amountReceived | number:'1.2-2' }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let s">
                <app-status-badge [kind]="s.paymentStatus"></app-status-badge>
              </td>
            </ng-container>

            <ng-container matColumnDef="confirmed">
              <th mat-header-cell *matHeaderCellDef>Stock</th>
              <td mat-cell *matCellDef="let s">
                <app-status-badge *ngIf="s.confirmed" kind="STOCK_OUT" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!s.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let s">
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item *ngIf="!s.confirmed" (click)="editSale(s)">
                    <mat-icon>edit</mat-icon><span>{{ 'sale.editDraft' | t }}</span>
                  </button>
                  <button mat-menu-item *ngIf="!s.confirmed" (click)="confirmSale(s)">
                    <mat-icon>done</mat-icon><span>{{ 'sale.confirm' | t }}</span>
                  </button>
                  <button mat-menu-item *ngIf="!s.confirmed" (click)="deleteSale(s)" class="text-danger">
                    <mat-icon>delete_outline</mat-icon><span>{{ 'sale.deleteDraft' | t }}</span>
                  </button>
                  <button mat-menu-item *ngIf="s.confirmed && s.paymentStatus !== 'PAID'" (click)="openReceiptForm(s)">
                    <mat-icon>payments</mat-icon><span>{{ 'sale.receipt' | t }}</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            <tr *matNoDataRow class="mat-row">
              <td class="no-data" [attr.colspan]="displayedColumns.length">
                <mat-icon>sell</mat-icon>
                <p>No sales yet. Record your first sale.</p>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Create sale -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card sale-dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ editingSale ? 'Edit draft sale' : 'Record sale' }}</h3>
            <button mat-icon-button type="button" (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="saleForm" (ngSubmit)="saveSale()" class="sale-form">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Sale date *</mat-label>
                <input matInput type="date" formControlName="saleDate" id="sale-date">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Sale type *</mat-label>
                <mat-select formControlName="saleType" id="sale-type" (selectionChange)="onSaleTypeChange()">
                  <mat-option value="RATE_BASED">Rate-based</mat-option>
                  <mat-option value="FOB">FOB</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Buyer *</mat-label>
                <mat-select formControlName="buyerId" id="sale-buyer">
                  <mat-option *ngFor="let p of buyers" [value]="p.id">{{ p.name }} ({{ p.type }})</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Commodity *</mat-label>
                <mat-select formControlName="commodityId" (selectionChange)="onCommodityChange()" id="sale-commodity">
                  <mat-option *ngFor="let c of commodities" [value]="c.id">{{ c.name }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Variety *</mat-label>
                <mat-select formControlName="commodityVarietyId" id="sale-variety">
                  <mat-option *ngFor="let v of varieties" [value]="v.id">{{ v.name }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Quantity (qtl) *</mat-label>
                <input matInput type="number" step="0.001" formControlName="quantityQuintals" id="sale-qty">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Bags</mat-label>
                <input matInput type="number" formControlName="bags" id="sale-bags">
              </mat-form-field>
              <mat-form-field appearance="outline" *ngIf="saleForm.value.saleType === 'RATE_BASED' || saleForm.value.ratePerQuintal != null">
                <mat-label>Rate ₹/qtl {{ saleForm.value.saleType === 'RATE_BASED' ? '*' : '' }}</mat-label>
                <input matInput type="number" step="0.01" formControlName="ratePerQuintal" id="sale-rate">
              </mat-form-field>
            </div>

            <div class="form-row" *ngIf="saleForm.value.saleType === 'FOB'">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>FOB details *</mat-label>
                <textarea matInput rows="2" formControlName="fobDetails" id="sale-fob"></textarea>
              </mat-form-field>
            </div>

            <div class="form-row" *ngIf="saleForm.value.saleType === 'FOB'">
              <mat-form-field appearance="outline">
                <mat-label>Rate ₹/qtl (optional)</mat-label>
                <input matInput type="number" step="0.01" formControlName="ratePerQuintal">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Total ₹ (if no rate)</mat-label>
                <input matInput type="number" step="0.01" formControlName="totalAmount" id="sale-total">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Transporter</mat-label>
                <mat-select formControlName="transporterId">
                  <mat-option [value]="null">None</mat-option>
                  <mat-option *ngFor="let t of transporters" [value]="t.id">{{ t.name }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Transport ₹</mat-label>
                <input matInput type="number" step="0.01" formControlName="transportCharge">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Labour ₹ (optional override)</mat-label>
                <input matInput type="number" step="0.01" formControlName="labourCharge">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Remarks</mat-label>
                <input matInput formControlName="remarks">
              </mat-form-field>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saleForm.invalid || saving">
                {{ saving ? 'Saving…' : (editingSale ? 'Update draft' : 'Save draft') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Receipt -->
      <div class="dialog-overlay" *ngIf="showReceiptForm" (click)="closeReceiptForm()">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Record receipt</h3>
            <button mat-icon-button type="button" (click)="closeReceiptForm()"><mat-icon>close</mat-icon></button>
          </div>
          <p class="dialog-context" *ngIf="receiptSale">
            {{ receiptSale.buyerName }} — due ₹{{ (receiptSale.totalAmount - receiptSale.amountReceived) | number:'1.2-2' }}
          </p>
          <form [formGroup]="receiptForm" (ngSubmit)="saveReceipt()">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Date *</mat-label>
              <input matInput type="date" formControlName="entryDate">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Amount ₹ *</mat-label>
              <input matInput type="number" step="0.01" formControlName="amount">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks</mat-label>
              <input matInput formControlName="remarks">
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeReceiptForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="receiptForm.invalid || saving">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sale-page { max-width: 1400px; }
    .filters-container { padding: 14px 16px; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; }
    .search-box {
      display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px;
      background: var(--color-surface-raised); border: 1px solid var(--color-border);
      border-radius: 10px; padding: 8px 12px;
    }
    .search-box input {
      border: none; outline: none; background: transparent; width: 100%;
      color: var(--color-text-primary); font: inherit;
    }
    .filter-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      border: 1px solid var(--color-border); background: var(--color-surface);
      border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600;
      color: var(--color-text-secondary); cursor: pointer;
    }
    .chip.active { background: var(--color-primary-soft); color: var(--color-primary-dark); border-color: transparent; }

    .sale-table { width: 100%; }
    .party-name, .variety-lbl, .amount { font-weight: 650; }
    .meta { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
    .status-ok, .status-pending {
      display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
    }
    .status-ok { color: var(--color-success); }
    .status-pending { color: var(--color-warning); }
    .status-ok mat-icon, .status-pending mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .loading-state, .no-data {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 48px; color: var(--color-text-muted); text-align: center;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .sale-dialog { max-width: 680px; }
    .sale-form { display: flex; flex-direction: column; gap: 4px; }
    .dialog-context { margin: -6px 0 12px; color: var(--color-text-secondary); font-size: 13px; font-weight: 600; }

    @media (max-width: 640px) {
      .page-header .btn { width: 100%; }
      .filter-row { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class SaleListComponent implements OnInit {
  displayedColumns = ['date', 'buyer', 'commodity', 'qty', 'total', 'status', 'confirmed', 'actions'];
  sales: Sale[] = [];
  filteredSales: Sale[] = [];
  buyers: Party[] = [];
  transporters: Party[] = [];
  commodities: Commodity[] = [];
  varieties: CommodityVariety[] = [];

  loading = false;
  saving = false;
  filterStatus = '';
  searchTerm = '';

  showForm = false;
  editingSale: Sale | null = null;
  saleForm: FormGroup;

  showReceiptForm = false;
  receiptSale: Sale | null = null;
  receiptForm: FormGroup;

  constructor(
    private saleService: SaleService,
    private partyService: PartyService,
    private commodityService: CommodityService,
    private cashbookService: CashbookService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.saleForm = this.fb.group({
      saleDate: [new Date().toISOString().slice(0, 10), Validators.required],
      saleType: ['RATE_BASED', Validators.required],
      buyerId: [null, Validators.required],
      commodityId: [null, Validators.required],
      commodityVarietyId: [null, Validators.required],
      quantityQuintals: [null, [Validators.required, Validators.min(0.001)]],
      bags: [0],
      ratePerQuintal: [null, Validators.required],
      transporterId: [null],
      transportCharge: [0],
      labourCharge: [null],
      totalAmount: [null],
      fobDetails: [''],
      remarks: ['']
    });

    this.receiptForm = this.fb.group({
      entryDate: [new Date().toISOString().slice(0, 10), Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['']
    });
  }

  ngOnInit() {
    this.loadSales();
    this.partyService.getAll().subscribe({
      next: res => {
        const parties = res.data ?? [];
        this.buyers = parties.filter(p => p.type === 'BUYER' || p.type === 'MILL');
        this.transporters = parties.filter(p => p.type === 'TRANSPORTER');
      }
    });
    this.commodityService.getAll().subscribe({
      next: res => this.commodities = res.data ?? []
    });
  }

  loadSales() {
    this.loading = true;
    this.saleService.getAll().subscribe({
      next: res => {
        this.sales = res.data ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Could not load sales', 'Close', { duration: 3000 });
      }
    });
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.applyFilters();
  }

  setFilterStatus(status: string) {
    this.filterStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredSales = this.sales.filter(s => {
      const statusOk = !this.filterStatus || s.paymentStatus === this.filterStatus;
      const searchOk = !this.searchTerm
        || s.buyerName.toLowerCase().includes(this.searchTerm)
        || s.commodityName.toLowerCase().includes(this.searchTerm)
        || s.commodityVarietyName.toLowerCase().includes(this.searchTerm);
      return statusOk && searchOk;
    });
  }

  openForm() {
    this.editingSale = null;
    this.saleForm.reset({
      saleDate: new Date().toISOString().slice(0, 10),
      saleType: 'RATE_BASED',
      buyerId: null,
      commodityId: null,
      commodityVarietyId: null,
      quantityQuintals: null,
      bags: 0,
      ratePerQuintal: null,
      transporterId: null,
      transportCharge: 0,
      labourCharge: null,
      totalAmount: null,
      fobDetails: '',
      remarks: ''
    });
    this.varieties = [];
    this.onSaleTypeChange();
    this.showForm = true;
  }

  editSale(sale: Sale) {
    this.editingSale = sale;
    this.saleForm.reset({
      saleDate: sale.saleDate,
      saleType: sale.saleType,
      buyerId: sale.buyerId,
      commodityId: sale.commodityId,
      commodityVarietyId: sale.commodityVarietyId,
      quantityQuintals: sale.quantityQuintals,
      bags: sale.bags,
      ratePerQuintal: sale.ratePerQuintal ?? null,
      transporterId: sale.transporterId ?? null,
      transportCharge: sale.transportCharge ?? 0,
      labourCharge: sale.labourCharge ?? null,
      totalAmount: sale.saleType === 'FOB' && !sale.ratePerQuintal ? sale.totalAmount : null,
      fobDetails: sale.fobDetails || '',
      remarks: sale.remarks || ''
    });
    this.onSaleTypeChange();
    this.commodityService.getVarieties(sale.commodityId).subscribe({
      next: res => {
        this.varieties = res.data ?? [];
        this.saleForm.patchValue({ commodityVarietyId: sale.commodityVarietyId });
      }
    });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingSale = null;
  }

  onSaleTypeChange() {
    const type = this.saleForm.value.saleType;
    const rateCtrl = this.saleForm.get('ratePerQuintal');
    const fobCtrl = this.saleForm.get('fobDetails');
    const totalCtrl = this.saleForm.get('totalAmount');

    if (type === 'RATE_BASED') {
      rateCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      fobCtrl?.clearValidators();
      totalCtrl?.clearValidators();
    } else {
      rateCtrl?.clearValidators();
      fobCtrl?.setValidators([Validators.required]);
      totalCtrl?.clearValidators();
    }
    rateCtrl?.updateValueAndValidity();
    fobCtrl?.updateValueAndValidity();
    totalCtrl?.updateValueAndValidity();
  }

  onCommodityChange() {
    const commodityId = this.saleForm.value.commodityId;
    this.saleForm.patchValue({ commodityVarietyId: null });
    this.varieties = [];
    if (!commodityId) return;
    this.commodityService.getVarieties(commodityId).subscribe({
      next: res => this.varieties = res.data ?? []
    });
  }

  private buildSaleRequest() {
    const v = this.saleForm.value;
    return {
      saleDate: v.saleDate,
      saleType: v.saleType,
      buyerId: v.buyerId,
      commodityVarietyId: v.commodityVarietyId,
      quantityQuintals: Number(v.quantityQuintals),
      bags: v.bags != null ? Number(v.bags) : 0,
      ratePerQuintal: v.ratePerQuintal != null && v.ratePerQuintal !== '' ? Number(v.ratePerQuintal) : undefined,
      transporterId: v.transporterId || undefined,
      transportCharge: v.transportCharge != null ? Number(v.transportCharge) : 0,
      labourCharge: v.labourCharge != null && v.labourCharge !== '' ? Number(v.labourCharge) : undefined,
      totalAmount: v.totalAmount != null && v.totalAmount !== '' ? Number(v.totalAmount) : undefined,
      fobDetails: v.fobDetails || undefined,
      remarks: v.remarks || undefined
    };
  }

  saveSale() {
    if (this.saleForm.invalid) return;
    const v = this.saleForm.value;
    if (v.saleType === 'FOB' && !v.ratePerQuintal && !v.totalAmount) {
      this.snackBar.open('FOB sale needs a rate or total amount', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const payload = this.buildSaleRequest();
    const isEdit = !!this.editingSale;
    const request$ = isEdit
      ? this.saleService.update(this.editingSale!.id, payload)
      : this.saleService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.closeForm();
        this.snackBar.open(isEdit ? 'Draft updated' : 'Sale draft saved', 'Close', { duration: 2500 });
        this.loadSales();
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Could not save sale', 'Close', { duration: 4000 });
      }
    });
  }

  confirmSale(sale: Sale) {
    this.saleService.confirm(sale.id).subscribe({
      next: () => {
        this.snackBar.open('Sale confirmed — stock reduced', 'Close', { duration: 2500 });
        this.loadSales();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Confirm failed', 'Close', { duration: 4000 })
    });
  }

  deleteSale(sale: Sale) {
    this.saleService.delete(sale.id).subscribe({
      next: () => {
        this.snackBar.open('Draft deleted', 'Close', { duration: 2000 });
        this.loadSales();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Delete failed', 'Close', { duration: 3500 })
    });
  }

  openReceiptForm(sale: Sale) {
    this.receiptSale = sale;
    const due = sale.totalAmount - sale.amountReceived;
    this.receiptForm.reset({
      entryDate: new Date().toISOString().slice(0, 10),
      amount: Number(due.toFixed(2)),
      remarks: `Receipt against Sale #${sale.id}`
    });
    this.showReceiptForm = true;
  }

  closeReceiptForm() {
    this.showReceiptForm = false;
    this.receiptSale = null;
  }

  saveReceipt() {
    if (this.receiptForm.invalid || !this.receiptSale) return;
    this.saving = true;
    const v = this.receiptForm.value;
    this.cashbookService.createEntry({
      entryDate: v.entryDate,
      type: 'RECEIPT',
      linkedSaleId: this.receiptSale.id,
      amount: Number(v.amount),
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.closeReceiptForm();
        this.snackBar.open('Receipt recorded', 'Close', { duration: 2500 });
        this.loadSales();
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Receipt failed', 'Close', { duration: 4000 });
      }
    });
  }
}
