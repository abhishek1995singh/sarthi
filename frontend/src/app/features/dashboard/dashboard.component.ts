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
import { MetricCardComponent, MetricTone } from '../../shared/ui/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

interface Metric {
  id: string;
  labelKey: string;
  value: string;
  hint: string;
  icon: string;
  tone: MetricTone;
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
  imports: [CommonModule, MatIconModule, RouterModule, TranslatePipe, MetricCardComponent, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="dashboard">
      <app-page-header [eyebrow]="'app.name' | t" [title]="'dashboard.greeting' | t"
                        [subtitle]="today | date: 'EEEE, d MMM yyyy'">
        <button type="button" class="refresh-btn" (click)="load()" [disabled]="loading" [attr.aria-label]="'action.search' | t">
          <mat-icon [class.spin]="loading">refresh</mat-icon>
        </button>
      </app-page-header>

      <div *ngIf="loading && !metrics.length" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>{{ 'dashboard.loading' | t }}</span>
      </div>

      <section class="metrics" aria-label="Today summary">
        <app-metric-card *ngFor="let m of metrics"
                          [icon]="m.icon" [value]="m.value" [label]="m.labelKey | t"
                          [hint]="m.hint" [tone]="m.tone" [link]="m.link"></app-metric-card>
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
              <div class="mini-value tabular-nums">₹{{ cashDay.openingBalance | number:'1.0-0' }}</div>
            </div>
            <div>
              <div class="mini-label">{{ 'cashbook.receipts' | t }}</div>
              <div class="mini-value tabular-nums text-success">+₹{{ cashDay.totalReceipts | number:'1.0-0' }}</div>
            </div>
            <div>
              <div class="mini-label">{{ 'cashbook.payments' | t }}</div>
              <div class="mini-value tabular-nums text-danger">−₹{{ cashDay.totalPayments | number:'1.0-0' }}</div>
            </div>
            <div class="cash-close">
              <div class="mini-label">{{ 'cashbook.closing' | t }}</div>
              <div class="mini-value tabular-nums strong">₹{{ cashDay.closingBalance | number:'1.0-0' }}</div>
            </div>
          </div>
        </div>
        <ng-template #noCash>
          <app-empty-state icon="account_balance_wallet" [message]="'dashboard.noCash' | t"></app-empty-state>
        </ng-template>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{{ 'dashboard.recentPurchases' | t }}</h2>
          <a routerLink="/purchase" class="link-more">{{ 'dashboard.open' | t }}</a>
        </div>
        <div class="list" *ngIf="recentPurchases.length; else noRecent">
          <a class="list-item card" *ngFor="let p of recentPurchases" [routerLink]="['/purchase']">
            <div class="list-main">
              <div class="list-title">{{ p.partyName }}</div>
              <div class="list-meta">{{ p.commodityVarietyName }} · {{ p.purchaseDate | date:'dd MMM' }}</div>
            </div>
            <div class="list-side">
              <div class="list-amt tabular-nums">₹{{ p.netPayable | number:'1.0-0' }}</div>
            </div>
          </a>
        </div>
        <ng-template #noRecent>
          <app-empty-state icon="shopping_bag" [message]="'dashboard.noPurchases' | t"></app-empty-state>
        </ng-template>
      </section>
    </div>
  `,
  styles: [`
    .dashboard { max-width: var(--page-max-width); margin: 0 auto; }

    .refresh-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
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
    .list-amt { font-weight: 800; color: var(--color-text-primary); }
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
    }
  `]
})
export class DashboardComponent implements OnInit {
  today = new Date();
  loading = false;
  metrics: Metric[] = [];
  cashDay: CashBookDay | null = null;
  recentPurchases: Purchase[] = [];

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

        const ledgerPayable = ledgerList.reduce((s, l) => s + Math.max(0, Number(l.totalOutstanding || 0)), 0);

        this.recentPurchases = [...purchaseList]
          .sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''))
          .slice(0, 5);

        this.metrics = [
          {
            id: 'purchase',
            labelKey: 'dashboard.metric.purchase',
            value: this.inr(purchaseAmt),
            hint: `${todayPurchases.length} · ${purchaseQty.toFixed(1)} qtl`,
            icon: 'shopping_bag',
            tone: 'default',
            link: '/purchase'
          },
          {
            id: 'sale',
            labelKey: 'dashboard.metric.sale',
            value: this.inr(saleAmt),
            hint: `${todaySales.length} · ${saleQty.toFixed(1)} qtl`,
            icon: 'sell',
            tone: 'default',
            link: '/sale'
          },
          {
            id: 'stock',
            labelKey: 'dashboard.metric.stock',
            value: `${stockQty.toFixed(1)} qtl`,
            hint: `${stockList.length} varieties`,
            icon: 'inventory_2',
            tone: 'default',
            link: '/masters/commodities'
          },
          {
            id: 'cash',
            labelKey: 'dashboard.metric.cash',
            value: this.inr(cashClose),
            hint: 'Today closing',
            icon: 'account_balance_wallet',
            tone: 'default',
            link: '/cashbook'
          },
          {
            id: 'recv',
            labelKey: 'dashboard.metric.receivable',
            value: this.inr(receivable),
            hint: 'From buyers',
            icon: 'south_west',
            tone: 'positive',
            link: '/sale'
          },
          {
            id: 'pay',
            labelKey: 'dashboard.metric.payable',
            value: this.inr(ledgerPayable),
            hint: 'To parties',
            icon: 'north_east',
            tone: 'negative',
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
