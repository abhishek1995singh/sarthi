import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PurchaseService } from '../../core/services/purchase.service';
import { SaleService } from '../../core/services/sale.service';
import { StockService } from '../../core/services/stock.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { LedgerService } from '../../core/services/ledger.service';
import { Purchase, Sale, Stock, CashBookDay, PartyLedgerSummary } from '../../core/models/models';

interface Metric {
  id: string;
  labelKey: string;
  value: string;
  hint: string;
  icon: string;
  tone: 'purchase' | 'sale' | 'stock' | 'cash' | 'in' | 'out';
  link: string;
}

interface QuickAction {
  id: string;
  labelKey: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, TranslatePipe],
  template: `
    <div class="dashboard">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">{{ 'app.name' | t }}</p>
          <h1 class="page-title">{{ 'dashboard.greeting' | t }}</h1>
          <p class="page-subtitle">{{ today | date: 'EEEE, d MMM yyyy' }}</p>
        </div>
        <button type="button" class="refresh-btn" (click)="load()" [disabled]="loading" [attr.aria-label]="'action.search' | t">
          <mat-icon [class.spin]="loading">refresh</mat-icon>
        </button>
      </header>

      <div *ngIf="loading && !metrics.length" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>{{ 'dashboard.loading' | t }}</span>
      </div>

      <section class="metrics" aria-label="Today summary">
        <a class="metric" *ngFor="let m of metrics" [routerLink]="m.link" [attr.data-tone]="m.tone">
          <div class="metric-top">
            <span class="metric-icon"><mat-icon>{{ m.icon }}</mat-icon></span>
            <mat-icon class="chevron">chevron_right</mat-icon>
          </div>
          <div class="metric-value">{{ m.value }}</div>
          <div class="metric-label">{{ m.labelKey | t }}</div>
          <div class="metric-hint">{{ m.hint }}</div>
        </a>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{{ 'dashboard.quickActions' | t }}</h2>
        </div>
        <div class="actions">
          <a *ngFor="let a of actions" [routerLink]="a.path" class="action" [attr.id]="a.id">
            <span class="action-icon"><mat-icon>{{ a.icon }}</mat-icon></span>
            <span class="action-label">{{ a.labelKey | t }}</span>
          </a>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{{ 'dashboard.cashToday' | t }}</h2>
          <a routerLink="/cashbook" class="link-more">{{ 'dashboard.open' | t }}</a>
        </div>
        <div class="cash-panel card" *ngIf="cashDay; else noCash">
          <div class="cash-row">
            <div>
              <div class="mini-label">{{ 'cashbook.opening' | t }}</div>
              <div class="mini-value">₹{{ cashDay.openingBalance | number:'1.0-0' }}</div>
            </div>
            <div>
              <div class="mini-label">{{ 'cashbook.receipts' | t }}</div>
              <div class="mini-value text-success">+₹{{ cashDay.totalReceipts | number:'1.0-0' }}</div>
            </div>
            <div>
              <div class="mini-label">{{ 'cashbook.payments' | t }}</div>
              <div class="mini-value text-danger">−₹{{ cashDay.totalPayments | number:'1.0-0' }}</div>
            </div>
            <div class="cash-close">
              <div class="mini-label">{{ 'cashbook.closing' | t }}</div>
              <div class="mini-value strong">₹{{ cashDay.closingBalance | number:'1.0-0' }}</div>
            </div>
          </div>
        </div>
        <ng-template #noCash>
          <div class="empty card">{{ 'dashboard.noCash' | t }}</div>
        </ng-template>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{{ 'dashboard.unpaidPurchases' | t }}</h2>
          <a routerLink="/purchase" class="link-more">{{ 'dashboard.open' | t }}</a>
        </div>
        <div class="list" *ngIf="unpaidPurchases.length; else noUnpaid">
          <a class="list-item card" *ngFor="let p of unpaidPurchases" [routerLink]="['/purchase']">
            <div class="list-main">
              <div class="list-title">{{ p.partyName }}</div>
              <div class="list-meta">{{ p.commodityVarietyName }} · {{ p.purchaseDate | date:'dd MMM' }}</div>
            </div>
            <div class="list-side">
              <div class="list-amt">₹{{ (p.netPayable - p.amountPaid) | number:'1.0-0' }}</div>
              <div class="list-status">{{ p.paymentStatus }}</div>
            </div>
          </a>
        </div>
        <ng-template #noUnpaid>
          <div class="empty card">{{ 'dashboard.noUnpaid' | t }}</div>
        </ng-template>
      </section>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1100px; margin: 0 auto; }

    .hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }
    .eyebrow {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-primary-dark);
    }
    .page-title { margin: 0; font-size: clamp(1.35rem, 4vw, 1.75rem); }
    .page-subtitle { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 13px; }

    .refresh-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      display: grid;
      place-items: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .refresh-btn:disabled { opacity: 0.6; }

    .metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      display: block;
      text-decoration: none;
      color: inherit;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 14px;
      min-height: 118px;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
    }
    .metric::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--tone);
    }
    .metric[data-tone='purchase'] { --tone: #D4622A; }
    .metric[data-tone='sale'] { --tone: #2A7DD4; }
    .metric[data-tone='stock'] { --tone: #16A34A; }
    .metric[data-tone='cash'] { --tone: #D97706; }
    .metric[data-tone='in'] { --tone: #15803D; }
    .metric[data-tone='out'] { --tone: #DC2626; }

    .metric-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .metric-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--tone) 14%, white);
      color: var(--tone);
    }
    .metric-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .chevron { color: var(--color-text-muted); font-size: 18px; width: 18px; height: 18px; }
    .metric-value {
      font-family: var(--font-heading);
      font-size: clamp(1.15rem, 3.8vw, 1.45rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .metric-label {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-secondary);
    }
    .metric-hint {
      margin-top: 2px;
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .section { margin-top: 22px; }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      gap: 8px;
    }
    .section-head h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .link-more {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-primary-dark);
      text-decoration: none;
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .action {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      text-decoration: none;
      color: var(--color-text-primary);
      font-weight: 600;
      font-size: 13px;
    }
    .action-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
      flex-shrink: 0;
    }
    .action-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }

    .cash-panel { padding: 14px; }
    .cash-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px 12px;
    }
    .cash-close {
      grid-column: 1 / -1;
      padding-top: 10px;
      border-top: 1px dashed var(--color-border);
    }
    .mini-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
    .mini-value { margin-top: 2px; font-weight: 700; font-size: 1rem; }
    .mini-value.strong { font-size: 1.25rem; font-family: var(--font-heading); font-weight: 800; }

    .list { display: flex; flex-direction: column; gap: 8px; }
    .list-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      text-decoration: none;
      color: inherit;
      min-height: 64px;
    }
    .list-title { font-weight: 700; font-size: 14px; }
    .list-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
    .list-side { text-align: right; }
    .list-amt { font-weight: 800; color: var(--color-danger); }
    .list-status { font-size: 10px; font-weight: 700; color: var(--color-text-muted); margin-top: 2px; text-transform: uppercase; }

    .empty {
      text-align: center;
      color: var(--color-text-muted);
      font-size: 13px;
      padding: 22px 14px;
    }
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 28px;
      margin-bottom: 12px;
      color: var(--color-text-secondary);
    }

    @media (min-width: 720px) {
      .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .actions { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .cash-row { grid-template-columns: repeat(4, 1fr); }
      .cash-close {
        grid-column: auto;
        padding-top: 0;
        border-top: none;
        border-left: 1px dashed var(--color-border);
        padding-left: 14px;
      }
    }

    @media (min-width: 1024px) {
      .metrics { grid-template-columns: repeat(6, minmax(0, 1fr)); }
      .metric { min-height: 132px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  today = new Date();
  loading = false;
  metrics: Metric[] = [];
  cashDay: CashBookDay | null = null;
  unpaidPurchases: Purchase[] = [];

  actions: QuickAction[] = [
    { id: 'quick-new-purchase', labelKey: 'dashboard.action.purchase', icon: 'add_shopping_cart', path: '/purchase' },
    { id: 'quick-new-sale', labelKey: 'dashboard.action.sale', icon: 'point_of_sale', path: '/sale' },
    { id: 'quick-cash', labelKey: 'dashboard.action.cash', icon: 'account_balance_wallet', path: '/cashbook' },
    { id: 'quick-reports', labelKey: 'dashboard.action.reports', icon: 'assessment', path: '/reports' },
  ];

  constructor(
    private purchaseService: PurchaseService,
    private saleService: SaleService,
    private stockService: StockService,
    private cashbookService: CashbookService,
    private ledgerService: LedgerService
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const today = this.localDate(this.today);

    forkJoin({
      purchases: this.purchaseService.getAll().pipe(catchError(() => of({ data: [] as Purchase[] }))),
      sales: this.saleService.getAll().pipe(catchError(() => of({ data: [] as Sale[] }))),
      stock: this.stockService.getAll().pipe(catchError(() => of({ data: [] as Stock[] }))),
      cash: this.cashbookService.getDay(today).pipe(catchError(() => of({ data: null as CashBookDay | null }))),
      ledgers: this.ledgerService.getAllSummaries().pipe(catchError(() => of({ data: [] as PartyLedgerSummary[] })))
    }).subscribe({
      next: ({ purchases, sales, stock, cash, ledgers }) => {
        const purchaseList = purchases.data || [];
        const saleList = sales.data || [];
        const stockList = stock.data || [];
        const ledgerList = ledgers.data || [];
        this.cashDay = cash.data || null;

        const todayPurchases = purchaseList.filter(p => p.purchaseDate === today);
        const todaySales = saleList.filter(s => s.saleDate === today);
        const purchaseAmt = todayPurchases.reduce((s, p) => s + Number(p.netPayable || 0), 0);
        const purchaseQty = todayPurchases.reduce((s, p) => s + Number(p.weightQuintals || 0), 0);
        const saleAmt = todaySales.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
        const saleQty = todaySales.reduce((s, p) => s + Number(p.quantityQuintals || 0), 0);
        const stockQty = stockList.reduce((s, x) => s + Number(x.quantityQuintals || 0), 0);
        const cashClose = this.cashDay?.closingBalance ?? 0;

        const receivable = saleList
          .filter(s => s.confirmed && s.paymentStatus !== 'PAID')
          .reduce((sum, s) => sum + (Number(s.totalAmount) - Number(s.amountReceived || 0)), 0);
        const payable = purchaseList
          .filter(p => p.confirmed && p.paymentStatus !== 'PAID')
          .reduce((sum, p) => sum + (Number(p.netPayable) - Number(p.amountPaid || 0)), 0);

        const ledgerPayable = ledgerList.reduce((s, l) => s + Math.max(0, Number(l.totalOutstanding || 0)), 0);

        this.unpaidPurchases = purchaseList
          .filter(p => p.confirmed && p.paymentStatus !== 'PAID')
          .sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''))
          .slice(0, 5);

        this.metrics = [
          {
            id: 'purchase',
            labelKey: 'dashboard.metric.purchase',
            value: this.inr(purchaseAmt),
            hint: `${todayPurchases.length} · ${purchaseQty.toFixed(1)} qtl`,
            icon: 'shopping_bag',
            tone: 'purchase',
            link: '/purchase'
          },
          {
            id: 'sale',
            labelKey: 'dashboard.metric.sale',
            value: this.inr(saleAmt),
            hint: `${todaySales.length} · ${saleQty.toFixed(1)} qtl`,
            icon: 'sell',
            tone: 'sale',
            link: '/sale'
          },
          {
            id: 'stock',
            labelKey: 'dashboard.metric.stock',
            value: `${stockQty.toFixed(1)} qtl`,
            hint: `${stockList.length} varieties`,
            icon: 'inventory_2',
            tone: 'stock',
            link: '/masters/commodities'
          },
          {
            id: 'cash',
            labelKey: 'dashboard.metric.cash',
            value: this.inr(cashClose),
            hint: 'Today closing',
            icon: 'account_balance_wallet',
            tone: 'cash',
            link: '/cashbook'
          },
          {
            id: 'recv',
            labelKey: 'dashboard.metric.receivable',
            value: this.inr(receivable),
            hint: 'From buyers',
            icon: 'south_west',
            tone: 'in',
            link: '/sale'
          },
          {
            id: 'pay',
            labelKey: 'dashboard.metric.payable',
            value: this.inr(ledgerPayable || payable),
            hint: 'To parties',
            icon: 'north_east',
            tone: 'out',
            link: '/ledger'
          }
        ];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private localDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private inr(n: number): string {
    return '₹' + Math.round(n || 0).toLocaleString('en-IN');
  }
}
