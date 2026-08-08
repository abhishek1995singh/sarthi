import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../core/services/report.service';
import { PartyService } from '../../core/services/party.service';
import {
  BardanaBalance,
  CashFlowReport,
  Party,
  PartyLedgerSummary,
  PurchaseSaleReport,
  Stock
} from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type ReportTab = 'cash' | 'purchaseSale' | 'stock' | 'bardana' | 'ledger';
type PsView = 'purchase' | 'sale';

interface TabDef {
  id: ReportTab;
  labelKey: string;
  icon: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="reports-page" [class.has-result]="hasResult">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'reports.title' | t }}</h1>
          <p class="page-subtitle">{{ 'reports.subtitleShort' | t }}</p>
        </div>
        <button
          class="btn btn-primary export-btn desktop-export"
          type="button"
          (click)="exportCsv()"
          [disabled]="!canExport">
          <mat-icon>download</mat-icon>
          <span>{{ 'reports.exportCsv' | t }}</span>
        </button>
      </header>

      <!-- Sticky controls -->
      <section class="controls card">
        <nav class="tab-rail" aria-label="Report types">
          <button
            type="button"
            class="tab"
            *ngFor="let t of tabs"
            [class.active]="tab === t.id"
            (click)="setTab(t.id)">
            <mat-icon>{{ t.icon }}</mat-icon>
            <span>{{ t.labelKey | t }}</span>
          </button>
        </nav>

        <div class="presets" *ngIf="needsDates">
          <button type="button" class="preset" [class.active]="preset === 'today'" (click)="applyPreset('today')">
            {{ 'reports.preset.today' | t }}
          </button>
          <button type="button" class="preset" [class.active]="preset === 'week'" (click)="applyPreset('week')">
            {{ 'reports.preset.week' | t }}
          </button>
          <button type="button" class="preset" [class.active]="preset === 'month'" (click)="applyPreset('month')">
            {{ 'reports.preset.month' | t }}
          </button>
        </div>

        <form [formGroup]="filterForm" class="filter-row" (ngSubmit)="run()">
          <mat-form-field appearance="outline" class="grow" *ngIf="needsDates">
            <mat-label>{{ 'reports.from' | t }}</mat-label>
            <input matInput type="date" formControlName="from" (change)="preset = 'custom'">
          </mat-form-field>
          <mat-form-field appearance="outline" class="grow" *ngIf="needsDates">
            <mat-label>{{ 'reports.to' | t }}</mat-label>
            <input matInput type="date" formControlName="to" (change)="preset = 'custom'">
          </mat-form-field>
          <mat-form-field appearance="outline" class="grow" *ngIf="tab === 'ledger'">
            <mat-label>{{ 'ledger.selectParty' | t }}</mat-label>
            <mat-select formControlName="partyId" (selectionChange)="run()">
              <mat-option *ngFor="let p of parties" [value]="p.id">{{ p.name }}</mat-option>
            </mat-select>
          </mat-form-field>
          <button
            class="btn btn-primary run-btn desktop-run"
            type="submit"
            [disabled]="loading || (needsDates && filterForm.invalid)">
            <mat-icon>{{ loading ? 'hourglass_empty' : 'play_arrow' }}</mat-icon>
            {{ 'reports.run' | t }}
          </button>
        </form>
      </section>

      <div *ngIf="loading" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>{{ 'reports.loading' | t }}</span>
      </div>

      <!-- Cash flow -->
      <ng-container *ngIf="!loading && tab === 'cash' && cashFlow">
        <section class="hero card">
          <div class="hero-label">Net cash</div>
          <div class="hero-amount" [class.text-success]="cashFlow.netCash >= 0" [class.text-danger]="cashFlow.netCash < 0">
            ₹{{ cashFlow.netCash | number:'1.0-0' }}
          </div>
          <div class="hero-range">{{ cashFlow.from }} → {{ cashFlow.to }}</div>
          <div class="hero-meta">
            <div>
              <span>{{ 'cashbook.receipts' | t }}</span>
              <strong class="text-success">₹{{ cashFlow.totalReceipts | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>{{ 'cashbook.payments' | t }}</span>
              <strong class="text-danger">₹{{ cashFlow.totalPayments | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>Entries</span>
              <strong>{{ cashFlow.entries.length }}</strong>
            </div>
          </div>
        </section>

        <div class="result-meta" *ngIf="cashFlow.entries.length">{{ cashFlow.entries.length }} entries</div>
        <div class="mobile-list" *ngIf="cashFlow.entries.length; else emptyCash">
          <article class="mobile-item card" *ngFor="let e of cashFlow.entries" [attr.data-type]="e.type">
            <div class="row-top">
              <app-status-badge [kind]="e.type"></app-status-badge>
              <strong [class.text-success]="e.type === 'RECEIPT'" [class.text-danger]="e.type === 'PAYMENT'">
                {{ e.type === 'PAYMENT' ? '−' : '+' }}₹{{ e.amount | number:'1.0-0' }}
              </strong>
            </div>
            <div class="row-title">{{ e.partyName || 'Cash entry' }}</div>
            <div class="row-meta">{{ e.date }} · bal ₹{{ e.runningBalance | number:'1.0-0' }}</div>
            <p class="remarks" *ngIf="e.remarks">{{ e.remarks }}</p>
          </article>
        </div>
        <ng-template #emptyCash><div class="empty card">{{ 'reports.empty' | t }}</div></ng-template>

        <div class="card table-only table-scroll">
          <table mat-table [dataSource]="cashFlow.entries" class="full-table">
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let e">{{ e.date }}</td></ng-container>
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let e"><app-status-badge [kind]="e.type"></app-status-badge></td></ng-container>
            <ng-container matColumnDef="party"><th mat-header-cell *matHeaderCellDef>Party</th><td mat-cell *matCellDef="let e">{{ e.partyName || '—' }}</td></ng-container>
            <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let e">₹{{ e.amount | number:'1.2-2' }}</td></ng-container>
            <ng-container matColumnDef="balance"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let e">₹{{ e.runningBalance | number:'1.2-2' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="cashColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: cashColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <!-- Purchase / Sale -->
      <ng-container *ngIf="!loading && tab === 'purchaseSale' && purchaseSale">
        <section class="hero card">
          <div class="hero-label">Period totals</div>
          <div class="hero-amount">₹{{ (purchaseSale.totalPurchaseNet + purchaseSale.totalSaleAmount) | number:'1.0-0' }}</div>
          <div class="hero-range">{{ purchaseSale.from }} → {{ purchaseSale.to }}</div>
          <div class="hero-meta">
            <div>
              <span>{{ 'nav.purchase' | t }}</span>
              <strong>₹{{ purchaseSale.totalPurchaseNet | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>{{ 'nav.sale' | t }}</span>
              <strong>₹{{ purchaseSale.totalSaleAmount | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>Rows</span>
              <strong>{{ purchaseSale.purchases.length + purchaseSale.sales.length }}</strong>
            </div>
          </div>
        </section>

        <div class="seg-row">
          <button type="button" class="seg" [class.active]="psView === 'purchase'" (click)="psView = 'purchase'">
            {{ 'nav.purchase' | t }} <em>{{ purchaseSale.purchases.length }}</em>
          </button>
          <button type="button" class="seg" [class.active]="psView === 'sale'" (click)="psView = 'sale'">
            {{ 'nav.sale' | t }} <em>{{ purchaseSale.sales.length }}</em>
          </button>
        </div>

        <ng-container *ngIf="psView === 'purchase'">
          <div class="mobile-list" *ngIf="purchaseSale.purchases.length; else emptyPsBuy">
            <article class="mobile-item card" *ngFor="let r of purchaseSale.purchases">
              <div class="row-top">
                <app-status-badge [kind]="r.paymentStatus"></app-status-badge>
                <strong>₹{{ r.netPayable | number:'1.0-0' }}</strong>
              </div>
              <div class="row-title">{{ r.partyName }}</div>
              <div class="row-meta">{{ r.date }} · {{ r.commodity }} / {{ r.variety }} · {{ r.weightQuintals }} qtl</div>
            </article>
          </div>
          <ng-template #emptyPsBuy><div class="empty card">{{ 'reports.empty' | t }}</div></ng-template>
          <div class="card table-only table-scroll">
            <table mat-table [dataSource]="purchaseSale.purchases" class="full-table">
              <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let r">{{ r.date }}</td></ng-container>
              <ng-container matColumnDef="party"><th mat-header-cell *matHeaderCellDef>Party</th><td mat-cell *matCellDef="let r">{{ r.partyName }}</td></ng-container>
              <ng-container matColumnDef="item"><th mat-header-cell *matHeaderCellDef>Item</th><td mat-cell *matCellDef="let r">{{ r.commodity }} / {{ r.variety }}</td></ng-container>
              <ng-container matColumnDef="qty"><th mat-header-cell *matHeaderCellDef>Qty</th><td mat-cell *matCellDef="let r">{{ r.weightQuintals }} qtl</td></ng-container>
              <ng-container matColumnDef="amt"><th mat-header-cell *matHeaderCellDef>Net</th><td mat-cell *matCellDef="let r">₹{{ r.netPayable | number:'1.2-2' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r"><app-status-badge [kind]="r.paymentStatus"></app-status-badge></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="psPurchaseColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: psPurchaseColumns;"></tr>
            </table>
          </div>
        </ng-container>

        <ng-container *ngIf="psView === 'sale'">
          <div class="mobile-list" *ngIf="purchaseSale.sales.length; else emptyPsSale">
            <article class="mobile-item card" *ngFor="let r of purchaseSale.sales">
              <div class="row-top">
                <app-status-badge [kind]="r.paymentStatus"></app-status-badge>
                <strong>₹{{ r.totalAmount | number:'1.0-0' }}</strong>
              </div>
              <div class="row-title">{{ r.buyerName }}</div>
              <div class="row-meta">{{ r.date }} · {{ r.commodity }} / {{ r.variety }} · {{ r.quantityQuintals }} qtl</div>
            </article>
          </div>
          <ng-template #emptyPsSale><div class="empty card">{{ 'reports.empty' | t }}</div></ng-template>
          <div class="card table-only table-scroll">
            <table mat-table [dataSource]="purchaseSale.sales" class="full-table">
              <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let r">{{ r.date }}</td></ng-container>
              <ng-container matColumnDef="party"><th mat-header-cell *matHeaderCellDef>Buyer</th><td mat-cell *matCellDef="let r">{{ r.buyerName }}</td></ng-container>
              <ng-container matColumnDef="item"><th mat-header-cell *matHeaderCellDef>Item</th><td mat-cell *matCellDef="let r">{{ r.commodity }} / {{ r.variety }}</td></ng-container>
              <ng-container matColumnDef="qty"><th mat-header-cell *matHeaderCellDef>Qty</th><td mat-cell *matCellDef="let r">{{ r.quantityQuintals }} qtl</td></ng-container>
              <ng-container matColumnDef="amt"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let r">₹{{ r.totalAmount | number:'1.2-2' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r"><app-status-badge [kind]="r.paymentStatus"></app-status-badge></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="psSaleColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: psSaleColumns;"></tr>
            </table>
          </div>
        </ng-container>
      </ng-container>

      <!-- Stock -->
      <ng-container *ngIf="!loading && tab === 'stock' && stockRows">
        <section class="hero card">
          <div class="hero-label">Stock on hand</div>
          <div class="hero-amount">{{ stockTotalQtl | number:'1.1-1' }} <small>qtl</small></div>
          <div class="hero-meta">
            <div>
              <span>Varieties</span>
              <strong>{{ stockRows.length }}</strong>
            </div>
            <div>
              <span>Bags</span>
              <strong>{{ stockTotalBags }}</strong>
            </div>
          </div>
        </section>

        <div class="mobile-list" *ngIf="stockRows.length; else emptyStock">
          <article class="mobile-item card" *ngFor="let s of stockRows">
            <div class="row-top">
              <span class="pill">{{ s.bags }} bags</span>
              <strong>{{ s.quantityQuintals | number:'1.2-2' }} qtl</strong>
            </div>
            <div class="row-title">{{ s.commodityName }}</div>
            <div class="row-meta">{{ s.commodityVarietyName }}</div>
          </article>
        </div>
        <ng-template #emptyStock><div class="empty card">{{ 'reports.empty' | t }}</div></ng-template>
        <div class="card table-only table-scroll">
          <table mat-table [dataSource]="stockRows" class="full-table">
            <ng-container matColumnDef="commodity"><th mat-header-cell *matHeaderCellDef>Commodity</th><td mat-cell *matCellDef="let s">{{ s.commodityName }}</td></ng-container>
            <ng-container matColumnDef="variety"><th mat-header-cell *matHeaderCellDef>Variety</th><td mat-cell *matCellDef="let s">{{ s.commodityVarietyName }}</td></ng-container>
            <ng-container matColumnDef="qty"><th mat-header-cell *matHeaderCellDef>Qty (qtl)</th><td mat-cell *matCellDef="let s">{{ s.quantityQuintals | number:'1.3-3' }}</td></ng-container>
            <ng-container matColumnDef="bags"><th mat-header-cell *matHeaderCellDef>Bags</th><td mat-cell *matCellDef="let s">{{ s.bags }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="stockColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: stockColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <!-- Bardana -->
      <ng-container *ngIf="!loading && tab === 'bardana' && bardanaRows">
        <section class="hero card">
          <div class="hero-label">Net bardana</div>
          <div class="hero-amount" [class.text-success]="bardanaNet > 0" [class.text-danger]="bardanaNet < 0">
            {{ bardanaNet }} <small>bags</small>
          </div>
          <div class="hero-meta">
            <div>
              <span>Rows</span>
              <strong>{{ bardanaRows.length }}</strong>
            </div>
          </div>
        </section>

        <div class="mobile-list" *ngIf="bardanaRows.length; else emptyBardana">
          <article class="mobile-item card" *ngFor="let b of bardanaRows">
            <div class="row-top">
              <span class="pill">{{ b.commodityName }}</span>
              <strong [class.text-success]="b.balanceBags > 0" [class.text-danger]="b.balanceBags < 0">
                {{ b.balanceBags }} bags
              </strong>
            </div>
            <div class="row-title">{{ b.partyName }}</div>
            <div class="row-meta">{{ b.commodityVarietyName }}</div>
          </article>
        </div>
        <ng-template #emptyBardana><div class="empty card">{{ 'reports.empty' | t }}</div></ng-template>
        <div class="card table-only table-scroll">
          <table mat-table [dataSource]="bardanaRows" class="full-table">
            <ng-container matColumnDef="party"><th mat-header-cell *matHeaderCellDef>Party</th><td mat-cell *matCellDef="let b">{{ b.partyName }}</td></ng-container>
            <ng-container matColumnDef="item"><th mat-header-cell *matHeaderCellDef>Item</th><td mat-cell *matCellDef="let b">{{ b.commodityName }} / {{ b.commodityVarietyName }}</td></ng-container>
            <ng-container matColumnDef="bags"><th mat-header-cell *matHeaderCellDef>Balance</th>
              <td mat-cell *matCellDef="let b" [class.text-success]="b.balanceBags > 0" [class.text-danger]="b.balanceBags < 0">{{ b.balanceBags }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="bardanaColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: bardanaColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <!-- Ledger -->
      <ng-container *ngIf="!loading && tab === 'ledger' && ledger">
        <section class="hero card" [class.owe]="ledger.totalOutstanding > 0">
          <div class="hero-label">{{ ledger.partyName }}</div>
          <div class="hero-amount">₹{{ ledger.totalOutstanding | number:'1.0-0' }}</div>
          <div class="hero-range">Total outstanding</div>
          <div class="hero-meta">
            <div>
              <span>{{ 'cashbook.opening' | t }}</span>
              <strong>₹{{ ledger.openingBalance | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>Entries</span>
              <strong>{{ ledger.entries.totalElements }}</strong>
            </div>
          </div>
        </section>

        <div class="mobile-list" *ngIf="ledger.entries.content.length; else emptyLedger">
          <article class="mobile-item card" *ngFor="let e of ledger.entries.content" [attr.data-type]="e.cashBookType">
            <div class="row-top">
              <app-status-badge [kind]="e.cashBookType"></app-status-badge>
              <strong>₹{{ e.amountPaid | number:'1.0-0' }}</strong>
            </div>
            <div class="row-title">{{ e.narration || '—' }}</div>
            <div class="row-meta">{{ e.entryDate }} · out ₹{{ e.outstandingBalanceAfter | number:'1.0-0' }}</div>
          </article>
        </div>
        <ng-template #emptyLedger><div class="empty card">{{ 'reports.empty' | t }}</div></ng-template>

        <div class="card table-only table-scroll">
          <table mat-table [dataSource]="ledger.entries.content" class="full-table">
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let e">{{ e.entryDate }}</td></ng-container>
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let e"><app-status-badge [kind]="e.cashBookType"></app-status-badge></td></ng-container>
            <ng-container matColumnDef="narration"><th mat-header-cell *matHeaderCellDef>Narration</th><td mat-cell *matCellDef="let e">{{ e.narration }}</td></ng-container>
            <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let e">₹{{ e.amountPaid | number:'1.2-2' }}</td></ng-container>
            <ng-container matColumnDef="out"><th mat-header-cell *matHeaderCellDef>Outstanding</th><td mat-cell *matCellDef="let e">₹{{ e.outstandingBalanceAfter | number:'1.2-2' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="ledgerColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: ledgerColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <!-- Mobile sticky actions -->
      <div class="mobile-actions">
        <button
          type="button"
          class="btn btn-ghost"
          (click)="exportCsv()"
          [disabled]="!canExport">
          <mat-icon>download</mat-icon>
          CSV
        </button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="run()"
          [disabled]="loading || (needsDates && filterForm.invalid)">
          <mat-icon>{{ loading ? 'hourglass_empty' : 'play_arrow' }}</mat-icon>
          {{ 'reports.run' | t }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .reports-page {
      max-width: 1100px;
      margin: 0 auto;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }

    .desktop-export { display: none; }
    .desktop-run { display: none; }

    .controls {
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 12px;
      margin-bottom: 12px;
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .tab-rail {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 10px;
      scroll-snap-type: x mandatory;
    }
    .tab-rail::-webkit-scrollbar { display: none; }
    .tab {
      scroll-snap-align: start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
      min-height: 40px;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
    }
    .tab mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tab.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }

    .presets {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      margin-bottom: 8px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .presets::-webkit-scrollbar { display: none; }
    .preset {
      flex: 0 0 auto;
      min-height: 34px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: transparent;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      color: var(--color-text-secondary);
      cursor: pointer;
    }
    .preset.active {
      background: var(--color-text-primary);
      border-color: var(--color-text-primary);
      color: var(--color-surface);
    }

    .filter-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2px 10px;
      align-items: start;
    }
    .grow { width: 100%; }

    .hero {
      padding: 16px;
      margin-bottom: 12px;
      background: linear-gradient(145deg, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)), var(--color-surface));
      border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-border));
    }
    .hero.owe {
      background: linear-gradient(145deg, color-mix(in srgb, var(--color-warning) 12%, var(--color-surface)), var(--color-surface));
    }
    .hero-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .hero-amount {
      font-family: var(--font-heading);
      font-size: clamp(1.6rem, 7vw, 2.1rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--color-text-primary);
      line-height: 1.1;
      margin: 4px 0 6px;
    }
    .hero-amount small {
      font-size: 0.55em;
      font-weight: 700;
      color: var(--color-text-muted);
    }
    .hero-range {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
    }
    .hero-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .hero-meta div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .hero-meta span {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--color-text-muted);
    }
    .hero-meta strong {
      font-size: 13px; font-weight: 750; color: var(--color-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .seg-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .seg {
      min-height: 42px;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
    }
    .seg em {
      font-style: normal;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--color-surface-raised);
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .seg.active {
      background: var(--color-primary-soft);
      border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
      color: var(--color-primary-dark);
    }

    .result-meta {
      font-size: 12px;
      font-weight: 650;
      color: var(--color-text-muted);
      margin: 0 2px 10px;
    }

    .mobile-list { display: flex; flex-direction: column; gap: 10px; }
    .mobile-item {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-left: 3px solid transparent;
    }
    .mobile-item[data-type="RECEIPT"] { border-left-color: var(--color-success); }
    .mobile-item[data-type="PAYMENT"] { border-left-color: var(--color-danger); }
    .row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 2px;
    }
    .row-title {
      font-weight: 750;
      font-size: 15px;
      color: var(--color-text-primary);
      line-height: 1.3;
      word-break: break-word;
    }
    .row-meta {
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.4;
    }
    .remarks {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      font-size: 11px;
      font-weight: 700;
    }

    .text-success { color: var(--color-success); font-weight: 750; }
    .text-danger { color: var(--color-danger); font-weight: 750; }
    .text-primary { color: var(--color-primary-dark); }

    .table-only { display: none; }
    .full-table { width: 100%; }

    .empty, .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 13px;
      padding: 36px 14px;
    }
    .loading-state {
      flex-direction: row;
      color: var(--color-text-secondary);
      padding: 28px;
    }

    .mobile-actions {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      display: grid;
      grid-template-columns: 0.85fr 1.15fr;
      gap: 8px;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
      background: color-mix(in srgb, var(--color-surface) 88%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid var(--color-border-subtle);
      box-shadow: 0 -8px 24px rgba(26, 35, 50, 0.08);
    }
    .mobile-actions .btn { width: 100%; min-height: 46px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 900px) {
      .reports-page { padding-bottom: 28px; }
      .desktop-export { display: inline-flex; }
      .desktop-run { display: inline-flex; width: auto; margin-top: 4px; }
      .mobile-actions { display: none; }
      .mobile-list { display: none; }
      .table-only { display: block; margin-top: 12px; }
      .controls { position: static; }
      .filter-row {
        grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
        align-items: start;
      }
      .hero-meta { grid-template-columns: repeat(3, 1fr); }
      .seg-row { max-width: 360px; }
    }

    @media (min-width: 1100px) {
      .filter-row {
        grid-template-columns: 1fr 1fr 1fr auto;
      }
    }

    @media (max-width: 420px) {
      .hero-meta { grid-template-columns: 1fr 1fr; }
      .hero-meta div:last-child { grid-column: 1 / -1; }
    }
  `]
})
export class ReportsComponent implements OnInit {
  tab: ReportTab = 'cash';
  psView: PsView = 'purchase';
  preset: 'today' | 'week' | 'month' | 'custom' = 'month';
  filterForm!: FormGroup;
  parties: Party[] = [];
  loading = false;

  tabs: TabDef[] = [
    { id: 'cash', labelKey: 'reports.cashFlow', icon: 'payments' },
    { id: 'purchaseSale', labelKey: 'reports.purchaseSale', icon: 'swap_horiz' },
    { id: 'stock', labelKey: 'reports.stock', icon: 'inventory_2' },
    { id: 'bardana', labelKey: 'reports.bardana', icon: 'shopping_bag' },
    { id: 'ledger', labelKey: 'reports.ledger', icon: 'menu_book' },
  ];

  cashFlow: CashFlowReport | null = null;
  purchaseSale: PurchaseSaleReport | null = null;
  stockRows: Stock[] | null = null;
  bardanaRows: BardanaBalance[] | null = null;
  ledger: PartyLedgerSummary | null = null;

  cashColumns = ['date', 'type', 'party', 'amount', 'balance'];
  psPurchaseColumns = ['date', 'party', 'item', 'qty', 'amt', 'status'];
  psSaleColumns = ['date', 'party', 'item', 'qty', 'amt', 'status'];
  stockColumns = ['commodity', 'variety', 'qty', 'bags'];
  bardanaColumns = ['party', 'item', 'bags'];
  ledgerColumns = ['date', 'type', 'narration', 'amount', 'out'];

  constructor(
    private reports: ReportService,
    private partyService: PartyService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.filterForm = this.fb.group({
      from: ['', Validators.required],
      to: ['', Validators.required],
      partyId: [null]
    });
    this.applyPreset('month', false);
    this.partyService.getAll().subscribe(r => {
      this.parties = r.data || [];
      if (this.parties.length) {
        this.filterForm.patchValue({ partyId: this.parties[0].id });
      }
      this.run();
    });
  }

  get needsDates(): boolean {
    return this.tab === 'cash' || this.tab === 'purchaseSale';
  }

  get hasResult(): boolean {
    return !!(this.cashFlow || this.purchaseSale || this.stockRows || this.bardanaRows || this.ledger);
  }

  get canExport(): boolean {
    return !this.loading && this.hasResult;
  }

  get stockTotalQtl(): number {
    return (this.stockRows || []).reduce((s, r) => s + (r.quantityQuintals || 0), 0);
  }

  get stockTotalBags(): number {
    return (this.stockRows || []).reduce((s, r) => s + (r.bags || 0), 0);
  }

  get bardanaNet(): number {
    return (this.bardanaRows || []).reduce((s, r) => s + (r.balanceBags || 0), 0);
  }

  applyPreset(kind: 'today' | 'week' | 'month', autoRun = true) {
    this.preset = kind;
    const today = new Date();
    const to = this.localDate(today);
    let fromDate = new Date(today);
    if (kind === 'week') {
      fromDate.setDate(today.getDate() - 6);
    } else if (kind === 'month') {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    this.filterForm.patchValue({
      from: this.localDate(fromDate),
      to
    });
    if (autoRun && this.needsDates) {
      this.run();
    }
  }

  private localDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  setTab(tab: ReportTab) {
    this.tab = tab;
    this.psView = 'purchase';
    if (tab === 'ledger') {
      this.filterForm.get('partyId')?.setValidators(Validators.required);
    } else {
      this.filterForm.get('partyId')?.clearValidators();
    }
    this.filterForm.get('partyId')?.updateValueAndValidity();
    this.run();
  }

  run() {
    if (this.needsDates && this.filterForm.invalid) return;
    if (this.tab === 'ledger' && !this.filterForm.value.partyId) return;

    this.loading = true;
    this.cashFlow = null;
    this.purchaseSale = null;
    this.stockRows = null;
    this.bardanaRows = null;
    this.ledger = null;

    const { from, to, partyId } = this.filterForm.value;
    const fail = (err: any) => {
      this.loading = false;
      this.snack.open(err?.error?.message || 'Report failed', 'OK', { duration: 3500 });
    };

    if (this.tab === 'cash') {
      this.reports.cashFlow(from, to).subscribe({
        next: r => { this.cashFlow = r.data; this.loading = false; },
        error: fail
      });
    } else if (this.tab === 'purchaseSale') {
      this.reports.purchaseSale(from, to).subscribe({
        next: r => { this.purchaseSale = r.data; this.loading = false; },
        error: fail
      });
    } else if (this.tab === 'stock') {
      this.reports.stock().subscribe({
        next: r => { this.stockRows = r.data; this.loading = false; },
        error: fail
      });
    } else if (this.tab === 'bardana') {
      this.reports.bardanaBalance().subscribe({
        next: r => { this.bardanaRows = r.data; this.loading = false; },
        error: fail
      });
    } else if (this.tab === 'ledger') {
      this.reports.ledger(partyId).subscribe({
        next: r => { this.ledger = r.data; this.loading = false; },
        error: fail
      });
    }
  }

  exportCsv() {
    let rows: string[][] = [];
    let filename = 'report.csv';

    if (this.tab === 'cash' && this.cashFlow) {
      filename = `cash-flow-${this.cashFlow.from}-${this.cashFlow.to}.csv`;
      rows = [['Date', 'Type', 'Party', 'Amount', 'Balance', 'Remarks']];
      for (const e of this.cashFlow.entries) {
        rows.push([e.date, e.type, e.partyName || '', String(e.amount), String(e.runningBalance), e.remarks || '']);
      }
    } else if (this.tab === 'purchaseSale' && this.purchaseSale) {
      filename = `purchase-sale-${this.purchaseSale.from}-${this.purchaseSale.to}.csv`;
      rows = [['Kind', 'Date', 'Party', 'Commodity', 'Variety', 'Qty', 'Bags', 'Amount', 'Status']];
      for (const p of this.purchaseSale.purchases) {
        rows.push(['Purchase', p.date, p.partyName, p.commodity, p.variety, String(p.weightQuintals), String(p.bags), String(p.netPayable), p.paymentStatus]);
      }
      for (const s of this.purchaseSale.sales) {
        rows.push(['Sale', s.date, s.buyerName, s.commodity, s.variety, String(s.quantityQuintals), String(s.bags), String(s.totalAmount), s.paymentStatus]);
      }
    } else if (this.tab === 'stock' && this.stockRows) {
      filename = 'stock.csv';
      rows = [['Commodity', 'Variety', 'Qty', 'Bags']];
      for (const s of this.stockRows) {
        rows.push([s.commodityName, s.commodityVarietyName, String(s.quantityQuintals), String(s.bags)]);
      }
    } else if (this.tab === 'bardana' && this.bardanaRows) {
      filename = 'bardana-balance.csv';
      rows = [['Party', 'Commodity', 'Variety', 'BalanceBags']];
      for (const b of this.bardanaRows) {
        rows.push([b.partyName, b.commodityName, b.commodityVarietyName, String(b.balanceBags)]);
      }
    } else if (this.tab === 'ledger' && this.ledger) {
      filename = `ledger-${this.ledger.partyName}.csv`;
      rows = [['Date', 'Type', 'Narration', 'Amount', 'Outstanding']];
      for (const e of this.ledger.entries.content) {
        rows.push([e.entryDate, e.cashBookType, e.narration || '', String(e.amountPaid), String(e.outstandingBalanceAfter)]);
      }
    } else {
      return;
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
