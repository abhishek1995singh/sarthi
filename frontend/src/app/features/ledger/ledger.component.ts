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
    <div class="ledger-page" [class.has-party]="!!selectedPartyId">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'ledger.title' | t }}</h1>
          <p class="page-subtitle">{{ 'ledger.subtitle' | t }}</p>
        </div>
        <button
          class="btn btn-primary desktop-pay"
          type="button"
          (click)="openPayForm()"
          id="btn-ledger-pay"
          [disabled]="!selectedPartyId">
          <mat-icon>payments</mat-icon> {{ 'ledger.recordPayment' | t }}
        </button>
      </header>

      <!-- Party picker -->
      <section class="picker card">
        <div class="party-search" *ngIf="parties.length > 8">
          <mat-icon>search</mat-icon>
          <input
            type="search"
            [placeholder]="'action.search' | t"
            [value]="partyQuery"
            (input)="onPartyQuery($event)"
            id="ledger-party-search"
            autocomplete="off" />
        </div>
        <mat-form-field appearance="outline" class="party-select">
          <mat-label>{{ 'ledger.selectParty' | t }}</mat-label>
          <mat-select
            [value]="selectedPartyId"
            (selectionChange)="onPartyChange($event.value)"
            id="ledger-party">
            <mat-option *ngFor="let p of filteredParties" [value]="p.id">
              {{ p.name }} · {{ p.type }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </section>

      <div *ngIf="!selectedPartyId" class="empty-state card">
        <mat-icon>menu_book</mat-icon>
        <h2>{{ 'ledger.selectParty' | t }}</h2>
        <p>Choose a party to see outstanding balance, unpaid purchases, and ledger history.</p>
      </div>

      <div *ngIf="selectedPartyId && loading && !summary" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading ledger…</span>
      </div>

      <ng-container *ngIf="summary as s">
        <!-- Hero outstanding -->
        <section class="hero card" [class.owe]="s.totalOutstanding > 0" [class.clear]="s.totalOutstanding === 0">
          <div class="hero-top">
            <div class="hero-party">
              <span class="party-type">{{ s.partyType }}</span>
              <h2>{{ s.partyName }}</h2>
            </div>
            <button
              type="button"
              class="icon-refresh"
              (click)="loadLedger()"
              [disabled]="loading"
              aria-label="Refresh">
              <mat-icon [class.spin]="loading">refresh</mat-icon>
            </button>
          </div>
          <div class="hero-label">Total outstanding</div>
          <div class="hero-amount">₹{{ s.totalOutstanding | number:'1.2-2' }}</div>
          <p class="hero-hint">
            <ng-container *ngIf="s.totalOutstanding > 0">Positive = we owe them</ng-container>
            <ng-container *ngIf="s.totalOutstanding < 0">Negative = they owe us</ng-container>
            <ng-container *ngIf="s.totalOutstanding === 0">Settled — nothing outstanding</ng-container>
          </p>
          <div class="hero-meta">
            <div>
              <span>Opening</span>
              <strong>₹{{ s.openingBalance | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>Purchases due</span>
              <strong>₹{{ s.purchaseOutstanding | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>Unpaid bills</span>
              <strong>{{ s.unpaidPurchases.length || 0 }}</strong>
            </div>
          </div>
        </section>

        <!-- Unpaid purchases -->
        <section class="block" *ngIf="s.unpaidPurchases.length">
          <div class="block-head">
            <h3>{{ 'ledger.unpaidPurchases' | t }}</h3>
            <span class="count">{{ s.unpaidPurchases.length }}</span>
          </div>

          <div class="mobile-list">
            <article class="mobile-item card" *ngFor="let p of s.unpaidPurchases">
              <div class="row-top">
                <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
                <strong class="due">₹{{ p.outstanding | number:'1.2-2' }}</strong>
              </div>
              <div class="row-title">{{ p.commodityVarietyName }}</div>
              <div class="row-meta">
                #{{ p.purchaseId }} · {{ p.purchaseDate }}
                · net ₹{{ p.netPayable | number:'1.0-0' }}
                · paid ₹{{ p.amountPaid | number:'1.0-0' }}
              </div>
              <button
                type="button"
                class="btn btn-primary btn-pay"
                (click)="openPayForm(p.purchaseId, p.outstanding)">
                <mat-icon>payments</mat-icon>
                {{ 'action.pay' | t }} ₹{{ p.outstanding | number:'1.0-0' }}
              </button>
            </article>
          </div>

          <div class="card table-only table-scroll">
            <table mat-table [dataSource]="s.unpaidPurchases" class="full-table">
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
                  <button class="btn btn-ghost btn-sm" type="button" (click)="openPayForm(p.purchaseId, p.outstanding)">
                    {{ 'action.pay' | t }}
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="unpaidColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: unpaidColumns;"></tr>
            </table>
          </div>
        </section>

        <!-- Ledger entries -->
        <section class="block">
          <div class="block-head">
            <h3>{{ 'ledger.entries' | t }}</h3>
            <span class="count">{{ s.entries.length || 0 }}</span>
          </div>

          <div *ngIf="loading" class="loading-state card compact">
            <mat-icon class="spin">autorenew</mat-icon>
            <span>Refreshing…</span>
          </div>

          <ng-container *ngIf="!loading">
            <div class="mobile-list" *ngIf="s.entries.length; else emptyEntries">
              <article class="mobile-item card entry" *ngFor="let e of s.entries">
                <div class="row-top">
                  <app-status-badge [kind]="e.cashBookType"></app-status-badge>
                  <strong [class.text-danger]="e.cashBookType === 'PAYMENT'"
                          [class.text-success]="e.cashBookType === 'RECEIPT'">
                    ₹{{ e.amountPaid | number:'1.2-2' }}
                  </strong>
                </div>
                <div class="row-title">{{ e.narration || (e.cashBookType === 'PAYMENT' ? 'Payment' : 'Entry') }}</div>
                <div class="row-meta">
                  {{ e.entryDate }}
                  <span *ngIf="e.commodityVarietyName"> · {{ e.commodityVarietyName }}</span>
                  · bal ₹{{ e.outstandingBalanceAfter | number:'1.0-0' }}
                </div>
              </article>
            </div>
            <ng-template #emptyEntries>
              <div class="empty-inline card">
                <mat-icon>receipt_long</mat-icon>
                <p>No ledger postings yet for this party.</p>
              </div>
            </ng-template>

            <div class="card table-only table-scroll" *ngIf="s.entries.length">
              <table mat-table [dataSource]="s.entries" class="full-table">
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
              </table>
            </div>
          </ng-container>
        </section>
      </ng-container>

      <!-- Mobile sticky pay -->
      <div class="mobile-pay-bar" *ngIf="selectedPartyId">
        <button
          type="button"
          class="btn btn-primary"
          (click)="openPayForm()"
          id="btn-ledger-pay-mobile">
          <mat-icon>payments</mat-icon>
          {{ 'ledger.recordPayment' | t }}
        </button>
      </div>

      <!-- Pay dialog -->
      <div class="dialog-overlay" *ngIf="showPayForm" (click)="closePayForm()">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'ledger.recordPayment' | t }}</h3>
            <button mat-icon-button type="button" (click)="closePayForm()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <p class="dialog-context" *ngIf="summary">
            {{ summary.partyName }} — outstanding
            <strong>₹{{ summary.totalOutstanding | number:'1.2-2' }}</strong>
          </p>
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
              <input matInput type="number" formControlName="amount" id="pay-amount" step="0.01" inputmode="decimal">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks</mat-label>
              <textarea matInput formControlName="remarks" rows="2"></textarea>
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closePayForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="payForm.invalid || saving">
                {{ saving ? 'Posting…' : 'Post Payment' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ledger-page {
      max-width: 1100px;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }

    .desktop-pay { display: none; }

    .picker {
      padding: 12px 14px 4px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .party-search {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface-raised);
    }
    .party-search mat-icon {
      color: var(--color-text-muted);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .party-search input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      font: inherit;
      font-size: 16px;
      color: var(--color-text-primary);
    }

    .party-select { width: 100%; }

    .hero {
      padding: 16px;
      margin-bottom: 16px;
      background:
        linear-gradient(145deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), var(--color-surface));
      border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
    }
    .hero.owe {
      background:
        linear-gradient(145deg, color-mix(in srgb, var(--color-warning) 12%, var(--color-surface)), var(--color-surface));
      border-color: color-mix(in srgb, var(--color-warning) 35%, var(--color-border));
    }
    .hero.clear {
      background:
        linear-gradient(145deg, color-mix(in srgb, var(--color-success) 10%, var(--color-surface)), var(--color-surface));
      border-color: color-mix(in srgb, var(--color-success) 30%, var(--color-border));
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }
    .party-type {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: 4px;
    }
    .hero-party h2 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: clamp(1.15rem, 4vw, 1.35rem);
      font-weight: 750;
      letter-spacing: -0.02em;
      color: var(--color-text-primary);
      line-height: 1.2;
    }
    .icon-refresh {
      width: 40px;
      height: 40px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .icon-refresh:disabled { opacity: 0.55; cursor: default; }

    .hero-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .hero-amount {
      font-family: var(--font-heading);
      font-size: clamp(1.75rem, 7vw, 2.25rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--color-text-primary);
      line-height: 1.1;
      margin: 4px 0 6px;
    }
    .hero-hint {
      margin: 0 0 14px;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
    .hero-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .hero-meta div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .hero-meta span {
      font-size: 10px;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
    }
    .hero-meta strong {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .block { margin-bottom: 18px; }
    .block-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .block-head h3 {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-secondary);
    }
    .count {
      min-width: 22px;
      height: 22px;
      padding: 0 7px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .mobile-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mobile-item {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .row-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1.3;
      word-break: break-word;
    }
    .row-meta {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.4;
    }
    .due { color: var(--color-danger); font-size: 1.05rem; }
    .text-danger { color: var(--color-danger); font-weight: 650; }
    .text-success { color: var(--color-success); font-weight: 650; }

    .btn-pay {
      margin-top: 8px;
      width: 100%;
      min-height: 44px;
    }

    .table-only { display: none; }
    .full-table { width: 100%; }
    .btn-sm { padding: 4px 12px; font-size: 12px; }

    .empty-state, .loading-state, .empty-inline {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 40px 20px;
      color: var(--color-text-muted);
      text-align: center;
    }
    .empty-state h2 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: 1.1rem;
      color: var(--color-text-primary);
    }
    .empty-state p, .empty-inline p {
      margin: 0;
      max-width: 32ch;
      font-size: 13px;
      line-height: 1.45;
    }
    .empty-state mat-icon, .empty-inline mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--color-border);
    }
    .loading-state.compact { padding: 24px; }

    .pay-form { display: flex; flex-direction: column; gap: 2px; }

    .mobile-pay-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
      background: color-mix(in srgb, var(--color-surface) 88%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid var(--color-border-subtle);
      box-shadow: 0 -8px 24px rgba(26, 35, 50, 0.08);
    }
    .mobile-pay-bar .btn { width: 100%; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 900px) {
      .ledger-page { padding-bottom: 24px; }
      .desktop-pay { display: inline-flex; }
      .mobile-pay-bar { display: none; }
      .mobile-list { display: none; }
      .table-only { display: block; margin-top: 0; }
      .hero-meta strong { font-size: 14px; }
    }

    @media (max-width: 420px) {
      .hero-meta { grid-template-columns: 1fr 1fr; }
      .hero-meta div:last-child { grid-column: 1 / -1; }
    }
  `]
})
export class LedgerComponent implements OnInit {
  parties: Party[] = [];
  filteredParties: Party[] = [];
  partyQuery = '';
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
      next: res => {
        this.parties = res.data || [];
        this.filteredParties = [...this.parties];
      }
    });
  }

  onPartyQuery(event: Event) {
    const value = (event.target as HTMLInputElement).value || '';
    this.partyQuery = value;
    const q = value.trim().toLowerCase();
    this.filteredParties = !q
      ? [...this.parties]
      : this.parties.filter(p =>
          p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
        );
  }

  onPartyChange(partyId: number | null) {
    this.selectedPartyId = partyId;
    if (!partyId) {
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

  closePayForm() {
    this.showPayForm = false;
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
