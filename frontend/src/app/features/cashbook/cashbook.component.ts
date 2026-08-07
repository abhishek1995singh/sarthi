import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CashbookService } from '../../core/services/cashbook.service';
import { PartyService } from '../../core/services/party.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { CashBookDay, Party, Purchase } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-cashbook',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="cashbook-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'cashbook.title' | t }}</h1>
          <p class="page-subtitle">{{ 'cashbook.subtitle' | t }}</p>
        </div>
        <div class="header-actions">
          <input type="date" class="date-input" [value]="selectedDate" (change)="onDateChange($event)" id="cashbook-date">
          <button class="btn btn-ghost" (click)="openOpeningForm()" *ngIf="day && !day.finalized && day.entries.length === 0" id="btn-opening">
            <mat-icon>account_balance</mat-icon> {{ 'cashbook.setOpening' | t }}
          </button>
          <button class="btn btn-primary" (click)="openEntryForm('PAYMENT')" id="btn-payment" [disabled]="day?.finalized">
            <mat-icon>call_made</mat-icon> {{ 'status.PAYMENT' | t }}
          </button>
          <button class="btn btn-primary" (click)="openEntryForm('RECEIPT')" id="btn-receipt" [disabled]="day?.finalized">
            <mat-icon>call_received</mat-icon> {{ 'status.RECEIPT' | t }}
          </button>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="summary-grid" *ngIf="day">
        <div class="summary-card card">
          <div class="summary-label">{{ 'cashbook.opening' | t }}</div>
          <div class="summary-value">₹{{ day.openingBalance | number:'1.2-2' }}</div>
        </div>
        <div class="summary-card card">
          <div class="summary-label">{{ 'cashbook.receipts' | t }}</div>
          <div class="summary-value text-success">+ ₹{{ day.totalReceipts | number:'1.2-2' }}</div>
        </div>
        <div class="summary-card card">
          <div class="summary-label">{{ 'cashbook.payments' | t }}</div>
          <div class="summary-value text-danger">− ₹{{ day.totalPayments | number:'1.2-2' }}</div>
        </div>
        <div class="summary-card card">
          <div class="summary-label">{{ 'cashbook.closing' | t }}</div>
          <div class="summary-value text-primary">₹{{ day.closingBalance | number:'1.2-2' }}</div>
          <app-status-badge [kind]="day.finalized ? 'FINALIZED' : 'OPEN'"></app-status-badge>
        </div>
      </div>

      <div class="card mt-lg">
        <div *ngIf="loading" class="loading-state">
          <mat-icon class="spin">autorenew</mat-icon> Loading cash book...
        </div>

        <div class="table-scroll" *ngIf="!loading && day">
          <table mat-table [dataSource]="day.entries" class="cashbook-table">
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let e">
                <app-status-badge [kind]="e.type"></app-status-badge>
              </td>
            </ng-container>

            <ng-container matColumnDef="party">
              <th mat-header-cell *matHeaderCellDef>Party</th>
              <td mat-cell *matCellDef="let e">{{ e.partyName || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="linked">
              <th mat-header-cell *matHeaderCellDef>Linked</th>
              <td mat-cell *matCellDef="let e">
                <span *ngIf="e.linkedPurchaseId">Purchase #{{ e.linkedPurchaseId }}</span>
                <span *ngIf="e.linkedSaleId">Sale #{{ e.linkedSaleId }}</span>
                <span *ngIf="!e.linkedPurchaseId && !e.linkedSaleId">—</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let e"
                  [class.text-success]="e.type === 'RECEIPT'"
                  [class.text-danger]="e.type === 'PAYMENT'">
                {{ e.type === 'PAYMENT' ? '−' : '+' }} ₹{{ e.amount | number:'1.2-2' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="balance">
              <th mat-header-cell *matHeaderCellDef>Running Balance</th>
              <td mat-cell *matCellDef="let e" class="balance-cell">₹{{ e.runningBalance | number:'1.2-2' }}</td>
            </ng-container>

            <ng-container matColumnDef="remarks">
              <th mat-header-cell *matHeaderCellDef>Remarks</th>
              <td mat-cell *matCellDef="let e">{{ e.remarks || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="by">
              <th mat-header-cell *matHeaderCellDef>By</th>
              <td mat-cell *matCellDef="let e">{{ e.createdByFullName }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <tr *matNoDataRow class="mat-row">
              <td class="no-data" [attr.colspan]="displayedColumns.length">
                <mat-icon>account_balance_wallet</mat-icon>
                <p>No cash entries for this day. Record a payment or receipt to begin.</p>
              </td>
            </tr>
          </table>
        </div>

        <div class="card-footer" *ngIf="day && !day.finalized && day.entries.length > 0">
          <button class="btn btn-ghost" (click)="finalizeDay()" id="btn-finalize">
            <mat-icon>lock</mat-icon> Finalize Day
          </button>
        </div>
      </div>

      <!-- Entry form overlay -->
      <div class="dialog-overlay" *ngIf="showEntryForm" (click)="closeEntryForm()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ entryFormType === 'PAYMENT' ? 'Record Payment' : 'Record Receipt' }}</h3>
            <button mat-icon-button (click)="closeEntryForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="entryForm" (ngSubmit)="saveEntry()" class="entry-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Date *</mat-label>
              <input matInput type="date" formControlName="entryDate" id="entry-date">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Party</mat-label>
              <mat-select formControlName="partyId" id="entry-party" (selectionChange)="onPartyChange()">
                <mat-option [value]="null">— None —</mat-option>
                <mat-option *ngFor="let p of parties" [value]="p.id">{{ p.name }} ({{ p.type }})</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full" *ngIf="entryFormType === 'PAYMENT' && unpaidPurchases.length">
              <mat-label>Link to Purchase (optional)</mat-label>
              <mat-select formControlName="linkedPurchaseId" id="entry-purchase">
                <mat-option [value]="null">— General payment —</mat-option>
                <mat-option *ngFor="let p of unpaidPurchases" [value]="p.id">
                  #{{ p.id }} — ₹{{ (p.netPayable - p.amountPaid) | number:'1.2-2' }} due ({{ p.commodityVarietyName }})
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Amount (₹) *</mat-label>
              <input matInput type="number" formControlName="amount" id="entry-amount" step="0.01" min="0.01">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks</mat-label>
              <textarea matInput formControlName="remarks" id="entry-remarks" rows="2"></textarea>
            </mat-form-field>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeEntryForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="entry-save" [disabled]="entryForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving...' : 'Post Entry' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Opening balance overlay -->
      <div class="dialog-overlay" *ngIf="showOpeningForm" (click)="showOpeningForm = false">
        <div class="dialog-panel card" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Set Opening Balance</h3>
            <button mat-icon-button (click)="showOpeningForm = false"><mat-icon>close</mat-icon></button>
          </div>
          <form [formGroup]="openingForm" (ngSubmit)="saveOpening()" class="entry-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Opening Balance (₹)</mat-label>
              <input matInput type="number" formControlName="openingBalance" id="opening-balance" step="0.01">
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="showOpeningForm = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="openingForm.invalid || saving">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cashbook-page { max-width: 1400px; }

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .date-input {
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-primary);
      padding: 8px 12px;
      font-size: 13px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-md);
      margin-bottom: var(--space-lg);
    }

    .summary-card { padding: var(--space-md) var(--space-lg); }
    .summary-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      margin-bottom: 6px;
    }
    .summary-value {
      font-family: var(--font-heading);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .text-success { color: var(--color-success); }
    .text-danger { color: var(--color-danger); }
    .text-primary { color: var(--color-primary-light); }

    .balance-cell { font-weight: 600; }
    .cashbook-table { width: 100%; }

    .card-footer {
      padding: var(--space-md) var(--space-lg);
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: flex-end;
    }

    .loading-state, .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px;
      color: var(--color-text-muted);
      text-align: center;
    }

    .dialog-panel {
      max-width: 480px;
    }

    .entry-form { display: flex; flex-direction: column; gap: 4px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .summary-grid { grid-template-columns: 1fr 1fr; }
      .toolbar { flex-direction: column; align-items: stretch; gap: 12px; }
    }
  `]
})
export class CashbookComponent implements OnInit {
  day: CashBookDay | null = null;
  loading = false;
  saving = false;
  selectedDate = new Date().toISOString().slice(0, 10);
  displayedColumns = ['type', 'party', 'linked', 'amount', 'balance', 'remarks', 'by'];

  parties: Party[] = [];
  unpaidPurchases: Purchase[] = [];

  showEntryForm = false;
  showOpeningForm = false;
  entryFormType: 'PAYMENT' | 'RECEIPT' = 'PAYMENT';
  entryForm!: FormGroup;
  openingForm!: FormGroup;

  constructor(
    private cashbookService: CashbookService,
    private partyService: PartyService,
    private purchaseService: PurchaseService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.entryForm = this.fb.group({
      entryDate: [this.selectedDate, Validators.required],
      partyId: [null],
      linkedPurchaseId: [null],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['']
    });
    this.openingForm = this.fb.group({
      openingBalance: [0, Validators.required]
    });
    this.loadDay();
    this.partyService.getAll().subscribe({
      next: res => { this.parties = res.data || []; },
      error: () => {}
    });
  }

  loadDay() {
    this.loading = true;
    this.cashbookService.getDay(this.selectedDate).subscribe({
      next: res => {
        this.day = res.data;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'Failed to load cash book', 'OK', { duration: 4000 });
      }
    });
  }

  onDateChange(event: Event) {
    this.selectedDate = (event.target as HTMLInputElement).value;
    this.loadDay();
  }

  openEntryForm(type: 'PAYMENT' | 'RECEIPT') {
    this.entryFormType = type;
    this.unpaidPurchases = [];
    this.entryForm.reset({
      entryDate: this.selectedDate,
      partyId: null,
      linkedPurchaseId: null,
      amount: null,
      remarks: ''
    });
    this.showEntryForm = true;
  }

  closeEntryForm() {
    this.showEntryForm = false;
  }

  onPartyChange() {
    const partyId = this.entryForm.value.partyId;
    this.entryForm.patchValue({ linkedPurchaseId: null });
    this.unpaidPurchases = [];
    if (!partyId || this.entryFormType !== 'PAYMENT') return;

    this.purchaseService.getAll().subscribe({
      next: res => {
        this.unpaidPurchases = (res.data || []).filter(
          p => p.partyId === partyId && p.confirmed && p.paymentStatus !== 'PAID'
        );
      }
    });
  }

  saveEntry() {
    if (this.entryForm.invalid) return;
    this.saving = true;
    const v = this.entryForm.value;
    this.cashbookService.createEntry({
      entryDate: v.entryDate,
      type: this.entryFormType,
      partyId: v.partyId || undefined,
      linkedPurchaseId: v.linkedPurchaseId || undefined,
      amount: Number(v.amount),
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showEntryForm = false;
        this.snack.open('Entry posted to cash book & ledger', 'OK', { duration: 3000 });
        this.loadDay();
      },
      error: err => {
        this.saving = false;
        this.snack.open(err?.error?.message || 'Failed to post entry', 'OK', { duration: 5000 });
      }
    });
  }

  openOpeningForm() {
    this.openingForm.patchValue({ openingBalance: this.day?.openingBalance ?? 0 });
    this.showOpeningForm = true;
  }

  saveOpening() {
    if (this.openingForm.invalid) return;
    this.saving = true;
    this.cashbookService.setOpeningBalance(this.selectedDate, Number(this.openingForm.value.openingBalance))
      .subscribe({
        next: res => {
          this.day = res.data;
          this.saving = false;
          this.showOpeningForm = false;
          this.snack.open('Opening balance updated', 'OK', { duration: 3000 });
        },
        error: err => {
          this.saving = false;
          this.snack.open(err?.error?.message || 'Failed to set opening balance', 'OK', { duration: 5000 });
        }
      });
  }

  finalizeDay() {
    if (!confirm('Finalize this day? Opening balance cannot be changed after finalization.')) return;
    this.cashbookService.finalizeDay(this.selectedDate).subscribe({
      next: res => {
        this.day = res.data;
        this.snack.open('Day finalized', 'OK', { duration: 3000 });
      },
      error: err => {
        this.snack.open(err?.error?.message || 'Failed to finalize', 'OK', { duration: 5000 });
      }
    });
  }
}
