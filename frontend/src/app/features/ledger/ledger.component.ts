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
import { LedgerService } from '../../core/services/ledger.service';
import { PartyService } from '../../core/services/party.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { Party, PartyLedgerSummary } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="ledger-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'ledger.title' | t }}</h1>
          <p class="page-subtitle">{{ 'ledger.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" (click)="openPayForm()" id="btn-ledger-pay" [disabled]="!selectedPartyId">
          <mat-icon>payments</mat-icon> {{ 'ledger.recordPayment' | t }}
        </button>
      </div>

      <div class="card mb-lg filters-container">
        <mat-form-field appearance="outline" class="party-select">
          <mat-label>{{ 'ledger.selectParty' | t }}</mat-label>
          <mat-select [value]="selectedPartyId" (selectionChange)="selectedPartyId = $event.value; onPartySelect()" id="ledger-party">
            <mat-option *ngFor="let p of parties" [value]="p.id">
              {{ p.name }} — {{ p.type }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div *ngIf="!selectedPartyId" class="card empty-state">
        <mat-icon>menu_book</mat-icon>
        <p>Select a party to view their ledger and outstanding balance.</p>
      </div>

      <ng-container *ngIf="summary">
        <div class="summary-grid">
          <div class="summary-card card">
            <div class="summary-label">Opening Balance</div>
            <div class="summary-value">₹{{ summary.openingBalance | number:'1.2-2' }}</div>
          </div>
          <div class="summary-card card">
            <div class="summary-label">Purchase Outstanding</div>
            <div class="summary-value">₹{{ summary.purchaseOutstanding | number:'1.2-2' }}</div>
          </div>
          <div class="summary-card card highlight">
            <div class="summary-label">Total Outstanding</div>
            <div class="summary-value text-primary">₹{{ summary.totalOutstanding | number:'1.2-2' }}</div>
            <div class="summary-hint">Positive = we owe them</div>
          </div>
        </div>

        <!-- Unpaid purchases -->
        <div class="mt-lg" *ngIf="summary.unpaidPurchases?.length">
          <h3 class="section-title">{{ 'ledger.unpaidPurchases' | t }}</h3>
          <div class="card">
            <table mat-table [dataSource]="summary.unpaidPurchases" class="full-table">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let p">{{ p.purchaseId }}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let p">{{ p.purchaseDate }}</td>
              </ng-container>
              <ng-container matColumnDef="variety">
                <th mat-header-cell *matHeaderCellDef>Variety</th>
                <td mat-cell *matCellDef="let p">{{ p.commodityVarietyName }}</td>
              </ng-container>
              <ng-container matColumnDef="net">
                <th mat-header-cell *matHeaderCellDef>Net Payable</th>
                <td mat-cell *matCellDef="let p">₹{{ p.netPayable | number:'1.2-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="paid">
                <th mat-header-cell *matHeaderCellDef>Paid</th>
                <td mat-cell *matCellDef="let p">₹{{ p.amountPaid | number:'1.2-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="due">
                <th mat-header-cell *matHeaderCellDef>Due</th>
                <td mat-cell *matCellDef="let p" class="text-danger">₹{{ p.outstanding | number:'1.2-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let p">
                  <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
                </td>
              </ng-container>
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let p">
                  <button class="btn btn-ghost btn-sm" (click)="openPayForm(p.purchaseId, p.outstanding)">
                    {{ 'action.pay' | t }}
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="unpaidColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: unpaidColumns;"></tr>
            </table>
          </div>
        </div>

        <!-- Ledger entries -->
        <div class="mt-lg">
          <h3 class="section-title">{{ 'ledger.entries' | t }}</h3>
          <div class="card">
            <div *ngIf="loading" class="loading-state">
              <mat-icon class="spin">autorenew</mat-icon> Loading...
            </div>
            <table mat-table [dataSource]="summary.entries" class="full-table" *ngIf="!loading">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let e">{{ e.entryDate }}</td>
              </ng-container>
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let e">
                  <app-status-badge [kind]="e.cashBookType"></app-status-badge>
                </td>
              </ng-container>
              <ng-container matColumnDef="narration">
                <th mat-header-cell *matHeaderCellDef>Narration</th>
                <td mat-cell *matCellDef="let e">{{ e.narration }}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let e">₹{{ e.amountPaid | number:'1.2-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="outstanding">
                <th mat-header-cell *matHeaderCellDef>Outstanding After</th>
                <td mat-cell *matCellDef="let e">₹{{ e.outstandingBalanceAfter | number:'1.2-2' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="entryColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: entryColumns;"></tr>
              <tr *matNoDataRow class="mat-row">
                <td class="no-data" [attr.colspan]="entryColumns.length">
                  <p>No ledger postings yet for this party.</p>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- Pay dialog -->
      <div class="dialog-overlay" *ngIf="showPayForm" (click)="showPayForm = false">
        <div class="dialog-panel card" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Record Payment</h3>
            <button mat-icon-button (click)="showPayForm = false"><mat-icon>close</mat-icon></button>
          </div>
          <form [formGroup]="payForm" (ngSubmit)="savePayment()" class="pay-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Date *</mat-label>
              <input matInput type="date" formControlName="entryDate" id="pay-date">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full" *ngIf="summary?.unpaidPurchases?.length">
              <mat-label>Against Purchase</mat-label>
              <mat-select formControlName="linkedPurchaseId" id="pay-purchase">
                <mat-option [value]="null">— General —</mat-option>
                <mat-option *ngFor="let p of summary!.unpaidPurchases" [value]="p.purchaseId">
                  #{{ p.purchaseId }} — due ₹{{ p.outstanding | number:'1.2-2' }}
                </mat-option>
              </mat-select>
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
              <button type="button" class="btn btn-ghost" (click)="showPayForm = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="payForm.invalid || saving">
                {{ saving ? 'Posting...' : 'Post Payment' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ledger-page { max-width: 1400px; }

    .filters-container { padding: var(--space-md) var(--space-lg); }
    .party-select { width: 100%; max-width: 420px; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--space-md);
    }
    .summary-card { padding: var(--space-md) var(--space-lg); }
    .summary-card.highlight { border-color: var(--color-primary); }
    .summary-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--color-text-muted); margin-bottom: 6px;
    }
    .summary-value {
      font-family: var(--font-heading); font-size: 1.4rem; font-weight: 700;
      color: var(--color-text-primary);
    }
    .summary-hint { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }
    .text-primary { color: var(--color-primary-light); }
    .text-danger { color: var(--color-danger); font-weight: 600; }

    .section-title {
      font-size: 0.95rem; font-weight: 600; color: var(--color-text-secondary);
      text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: var(--space-md);
    }

    .full-table { width: 100%; }
    .btn-sm { padding: 4px 12px; font-size: 12px; }

    .empty-state, .loading-state, .no-data {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 48px; color: var(--color-text-muted); text-align: center;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--color-border); }

    .dialog-panel { max-width: 460px; }
    .pay-form { display: flex; flex-direction: column; gap: 4px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .summary-grid { grid-template-columns: 1fr 1fr; }
      .party-toolbar { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class LedgerComponent implements OnInit {
  parties: Party[] = [];
  selectedPartyId: number | null = null;
  summary: PartyLedgerSummary | null = null;
  loading = false;
  saving = false;
  showPayForm = false;

  unpaidColumns = ['id', 'date', 'variety', 'net', 'paid', 'due', 'status', 'action'];
  entryColumns = ['date', 'type', 'narration', 'amount', 'outstanding'];

  payForm!: FormGroup;

  constructor(
    private ledgerService: LedgerService,
    private partyService: PartyService,
    private cashbookService: CashbookService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.payForm = this.fb.group({
      entryDate: [new Date().toISOString().slice(0, 10), Validators.required],
      linkedPurchaseId: [null],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['']
    });
    this.partyService.getAll().subscribe({
      next: res => { this.parties = res.data || []; }
    });
  }

  onPartySelect() {
    if (!this.selectedPartyId) {
      this.summary = null;
      return;
    }
    this.loadLedger();
  }

  loadLedger() {
    if (!this.selectedPartyId) return;
    this.loading = true;
    this.ledgerService.getPartyLedger(this.selectedPartyId).subscribe({
      next: res => {
        this.summary = res.data;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'Failed to load ledger', 'OK', { duration: 4000 });
      }
    });
  }

  openPayForm(purchaseId?: number, amount?: number) {
    this.payForm.reset({
      entryDate: new Date().toISOString().slice(0, 10),
      linkedPurchaseId: purchaseId ?? null,
      amount: amount ?? null,
      remarks: ''
    });
    this.showPayForm = true;
  }

  savePayment() {
    if (this.payForm.invalid || !this.selectedPartyId) return;
    this.saving = true;
    const v = this.payForm.value;
    this.cashbookService.createEntry({
      entryDate: v.entryDate,
      type: 'PAYMENT',
      partyId: this.selectedPartyId,
      linkedPurchaseId: v.linkedPurchaseId || undefined,
      amount: Number(v.amount),
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showPayForm = false;
        this.snack.open('Payment posted to cash book & ledger', 'OK', { duration: 3000 });
        this.loadLedger();
      },
      error: err => {
        this.saving = false;
        this.snack.open(err?.error?.message || 'Failed to post payment', 'OK', { duration: 5000 });
      }
    });
  }
}
