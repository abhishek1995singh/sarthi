import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PurchaseService } from '../../core/services/purchase.service';
import { PartyService } from '../../core/services/party.service';
import { CommodityService } from '../../core/services/commodity.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { Purchase, Party, Commodity, CommodityVariety, CommoditySettings } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type PurchaseFilter = '' | 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule,
    MatSnackBarModule, StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="purchase-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'purchase.title' | t }}</h1>
          <p class="page-subtitle">{{ 'purchase.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary desktop-add" type="button" (click)="openForm()" id="btn-add-purchase">
          <mat-icon>add_shopping_cart</mat-icon>
          {{ 'purchase.record' | t }}
        </button>
      </header>

      <section class="toolbar card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input
            type="search"
            [placeholder]="'action.search' | t"
            [value]="searchText"
            (input)="onSearch($event)"
            id="search-purchase"
            autocomplete="off" />
          <button type="button" class="clear-btn" *ngIf="searchText" (click)="clearSearch()" aria-label="Clear">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="type-scroll" role="tablist">
          <button type="button" class="chip" [class.active]="filterStatus === ''" (click)="setFilterStatus('')">
            {{ 'filter.all' | t }} <em>{{ purchases.length }}</em>
          </button>
          <button type="button" class="chip" [class.active]="filterStatus === 'DRAFT'" (click)="setFilterStatus('DRAFT')">
            {{ 'status.DRAFT' | t }} <em>{{ draftCount }}</em>
          </button>
          <button type="button" class="chip" [class.active]="filterStatus === 'UNPAID'" (click)="setFilterStatus('UNPAID')">
            {{ 'status.UNPAID' | t }} <em>{{ countStatus('UNPAID') }}</em>
          </button>
          <button type="button" class="chip" [class.active]="filterStatus === 'PARTIALLY_PAID'" (click)="setFilterStatus('PARTIALLY_PAID')">
            {{ 'status.PARTIALLY_PAID' | t }} <em>{{ countStatus('PARTIALLY_PAID') }}</em>
          </button>
          <button type="button" class="chip" [class.active]="filterStatus === 'PAID'" (click)="setFilterStatus('PAID')">
            {{ 'status.PAID' | t }} <em>{{ countStatus('PAID') }}</em>
          </button>
        </div>
      </section>

      <section class="kpi-row" *ngIf="!loading && purchases.length">
        <div class="kpi card warn" *ngIf="draftCount">
          <span>Drafts</span>
          <strong>{{ draftCount }}</strong>
          <small>Need confirm</small>
        </div>
        <div class="kpi card danger" *ngIf="dueTotal > 0">
          <span>Due to pay</span>
          <strong>₹{{ dueTotal | number:'1.0-0' }}</strong>
          <small>{{ unpaidConfirmedCount }} bills</small>
        </div>
        <div class="kpi card">
          <span>Showing</span>
          <strong>{{ filteredPurchases.length }}</strong>
          <small>purchase{{ filteredPurchases.length === 1 ? '' : 's' }}</small>
        </div>
      </section>

      <div *ngIf="loading" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading purchases…</span>
      </div>

      <ng-container *ngIf="!loading">
        <div class="mobile-list" *ngIf="filteredPurchases.length; else emptyState">
          <article class="purchase-card card" *ngFor="let p of filteredPurchases" [class.draft]="!p.confirmed">
            <div class="card-top">
              <div class="badges">
                <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
                <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </div>
              <div class="amount-block">
                <strong>₹{{ p.netPayable | number:'1.0-0' }}</strong>
                <span class="due" *ngIf="p.confirmed && dueOf(p) > 0">due ₹{{ dueOf(p) | number:'1.0-0' }}</span>
              </div>
            </div>

            <h3 class="party">{{ p.partyName }}</h3>
            <p class="item">{{ p.commodityVarietyName }} · {{ p.commodityName }}</p>
            <p class="meta">
              {{ p.purchaseDate | date:'dd MMM yyyy' }}
              · {{ p.weightQuintals | number:'1.2-2' }} qtl
              · {{ p.bags }} bags
              · ₹{{ p.ratePerQuintal | number:'1.0-0' }}/qtl
            </p>

            <div class="progress" *ngIf="p.confirmed && p.netPayable > 0">
              <div class="progress-bar">
                <i [style.width.%]="paidPct(p)"></i>
              </div>
              <span>Paid ₹{{ p.amountPaid | number:'1.0-0' }} / ₹{{ p.netPayable | number:'1.0-0' }}</span>
            </div>

            <div class="card-actions">
              <ng-container *ngIf="!p.confirmed">
                <button type="button" class="btn btn-primary" (click)="confirmPurchase(p)">
                  <mat-icon>done_all</mat-icon> Confirm
                </button>
                <button type="button" class="icon-btn danger" (click)="deletePurchase(p)" aria-label="Delete">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </ng-container>
              <ng-container *ngIf="p.confirmed && p.paymentStatus !== 'PAID'">
                <button type="button" class="btn btn-primary" (click)="openPayForm(p)">
                  <mat-icon>payments</mat-icon> Pay ₹{{ dueOf(p) | number:'1.0-0' }}
                </button>
              </ng-container>
              <ng-container *ngIf="p.confirmed && p.paymentStatus === 'PAID'">
                <span class="settled"><mat-icon>verified</mat-icon> Settled</span>
              </ng-container>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="empty-state card">
            <mat-icon>shopping_bag</mat-icon>
            <h2>{{ searchText || filterStatus ? 'No matches' : 'No purchases yet' }}</h2>
            <p *ngIf="!searchText && !filterStatus">Record a draft purchase, confirm to add stock, then pay the aadhti.</p>
            <p *ngIf="searchText || filterStatus">Try another search or filter.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()" *ngIf="!searchText && !filterStatus">
              <mat-icon>add_shopping_cart</mat-icon>
              {{ 'purchase.record' | t }}
            </button>
          </div>
        </ng-template>

        <div class="card table-only table-scroll" *ngIf="filteredPurchases.length">
          <table mat-table [dataSource]="filteredPurchases" class="purchase-table">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let p">{{ p.purchaseDate | date:'dd MMM yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="party">
              <th mat-header-cell *matHeaderCellDef>Aadhti</th>
              <td mat-cell *matCellDef="let p">
                <div class="party-name">{{ p.partyName }}</div>
                <div class="created-by" *ngIf="p.createdByFullName">By {{ p.createdByFullName }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="commodity">
              <th mat-header-cell *matHeaderCellDef>Commodity</th>
              <td mat-cell *matCellDef="let p">
                <div class="variety-lbl">{{ p.commodityVarietyName }}</div>
                <div class="commodity-lbl">{{ p.commodityName }}</div>
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
              <th mat-header-cell *matHeaderCellDef>Rate</th>
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
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let p">
                <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
              </td>
            </ng-container>
            <ng-container matColumnDef="confirmed">
              <th mat-header-cell *matHeaderCellDef>Stock</th>
              <td mat-cell *matCellDef="let p">
                <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu" [attr.id]="'purchase-action-' + p.id">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" *ngIf="!p.confirmed" (click)="confirmPurchase(p)">
                    <mat-icon>done</mat-icon><span>Confirm & Add Stock</span>
                  </button>
                  <button mat-menu-item type="button" *ngIf="!p.confirmed" (click)="deletePurchase(p)" class="text-danger">
                    <mat-icon>delete_outline</mat-icon><span>Delete Draft</span>
                  </button>
                  <button mat-menu-item type="button" *ngIf="p.confirmed && p.paymentStatus !== 'PAID'" (click)="openPayForm(p)">
                    <mat-icon>payments</mat-icon><span>Record Payment</span>
                  </button>
                  <button mat-menu-item type="button" *ngIf="p.confirmed && p.paymentStatus === 'PAID'" disabled>
                    <mat-icon>check_circle</mat-icon><span>Fully Paid</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <button type="button" class="fab" (click)="openForm()" id="btn-add-purchase-mobile" aria-label="Record purchase">
        <mat-icon>add_shopping_cart</mat-icon>
      </button>

      <!-- Record purchase -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card purchase-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'purchase.record' | t }}</h3>
            <button mat-icon-button type="button" (click)="closeForm()" aria-label="Close"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="purchaseForm" (ngSubmit)="savePurchase()" class="purchase-form">
            <div class="form-section">
              <div class="form-section-title">Invoice</div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Invoice Date *</mat-label>
                  <input matInput type="date" formControlName="purchaseDate" id="purchase-date">
                  <mat-error>Date is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Aadhti (Supplier) *</mat-label>
                  <mat-select formControlName="partyId" id="purchase-party">
                    <mat-option *ngFor="let party of suppliers" [value]="party.id">{{ party.name }}</mat-option>
                  </mat-select>
                  <mat-error>Supplier is required</mat-error>
                </mat-form-field>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-title">Commodity</div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Commodity *</mat-label>
                  <mat-select formControlName="commodityId" (selectionChange)="onCommodityChange()" id="purchase-commodity">
                    <mat-option *ngFor="let c of commodities" [value]="c.id">{{ c.name }}</mat-option>
                  </mat-select>
                  <mat-error>Commodity is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Variety *</mat-label>
                  <mat-select formControlName="commodityVarietyId" (selectionChange)="onVarietyChange()" id="purchase-variety">
                    <mat-option *ngFor="let v of varieties" [value]="v.id">{{ v.name }}</mat-option>
                  </mat-select>
                  <mat-error>Variety is required</mat-error>
                </mat-form-field>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-title">Quantity &amp; rate</div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Weight (Quintals) *</mat-label>
                  <input matInput type="number" formControlName="weightQuintals" (input)="recalculateBill()" id="purchase-weight" step="0.001" inputmode="decimal" placeholder="0.000">
                  <mat-error>Weight is required and must be positive</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Rate (₹ per Quintal) *</mat-label>
                  <input matInput type="number" formControlName="ratePerQuintal" (input)="recalculateBill()" id="purchase-rate" step="0.01" inputmode="decimal" placeholder="0.00">
                  <mat-error>Rate is required and must be positive</mat-error>
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Bags Count (Optional)</mat-label>
                  <input matInput type="number" formControlName="bags" id="purchase-bags" inputmode="numeric" placeholder="Auto-calculated if empty">
                  <mat-hint>Calculated using bag weight setting</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Cash Discount %</mat-label>
                  <mat-select formControlName="cashDiscountPct" (selectionChange)="recalculateBill()" id="purchase-cd">
                    <mat-option [value]="0">None (0%)</mat-option>
                    <mat-option *ngFor="let pct of allowedDiscounts" [value]="pct">{{ pct }}%</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks / Notes</mat-label>
              <textarea matInput formControlName="remarks" id="purchase-remarks" rows="2"></textarea>
            </mat-form-field>

            <div class="billing-summary" *ngIf="billCalculated">
              <div class="billing-title">Invoice summary</div>
              <div class="billing-grid">
                <div class="billing-item">
                  <span class="lbl">Gross (Weight × Rate)</span>
                  <span class="val">₹{{ bill.grossAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item">
                  <span class="lbl">Gaushala (₹{{ bill.gaushalaRate }}/qtl)</span>
                  <span class="val text-negative">− ₹{{ bill.gaushalaAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item">
                  <span class="lbl">Commission ({{ bill.commissionRate }}%)</span>
                  <span class="val text-negative">− ₹{{ bill.commissionAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item" *ngIf="bill.cashDiscountAmount > 0">
                  <span class="lbl">Cash Discount ({{ bill.cashDiscountPct }}%)</span>
                  <span class="val text-negative">− ₹{{ bill.cashDiscountAmount | number:'1.2-2' }}</span>
                </div>
                <div class="billing-item grand-total">
                  <span class="lbl">Net Payable to Aadhti</span>
                  <span class="val text-primary">₹{{ bill.netPayable | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" id="purchase-save" [disabled]="purchaseForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving…' : 'Save draft' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Pay -->
      <div class="dialog-overlay" *ngIf="showPayForm" (click)="closePayForm()">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>Pay Purchase #{{ payingPurchase?.id }}</h3>
            <button mat-icon-button type="button" (click)="closePayForm()" aria-label="Close"><mat-icon>close</mat-icon></button>
          </div>
          <p class="dialog-context" *ngIf="payingPurchase">
            {{ payingPurchase.partyName }} — Due
            <strong>₹{{ dueOf(payingPurchase) | number:'1.2-2' }}</strong>
          </p>
          <form [formGroup]="payForm" (ngSubmit)="savePayment()" class="pay-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Payment Date *</mat-label>
              <input matInput type="date" formControlName="entryDate" id="pay-date">
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
              <button type="button" class="btn btn-ghost" (click)="closePayForm()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="payForm.invalid || paying">
                {{ paying ? 'Posting…' : 'Post Payment' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .purchase-page {
      max-width: 1100px;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }
    .desktop-add { display: none; }

    .toolbar {
      position: sticky; top: 0; z-index: 5;
      padding: 12px; margin-bottom: 12px;
      display: flex; flex-direction: column; gap: 10px;
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    }
    .search-box {
      display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px;
      border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-raised);
    }
    .search-box mat-icon { color: var(--color-text-muted); font-size: 20px; width: 20px; height: 20px; }
    .search-box input {
      border: none; outline: none; background: transparent; width: 100%;
      font: inherit; font-size: 16px; color: var(--color-text-primary);
    }
    .clear-btn {
      border: none; background: transparent; color: var(--color-text-muted);
      width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; border-radius: 8px; padding: 0;
    }
    .clear-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .type-scroll {
      display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch;
      scrollbar-width: none; padding-bottom: 2px;
    }
    .type-scroll::-webkit-scrollbar { display: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto;
      min-height: 36px; padding: 0 12px; border-radius: 999px;
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-secondary); cursor: pointer; font: inherit;
      font-size: 12px; font-weight: 650; white-space: nowrap;
    }
    .chip em {
      font-style: normal; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
      background: var(--color-surface-raised); font-size: 10px;
      display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-muted);
    }
    .chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .chip.active em { background: rgba(255,255,255,0.22); color: #fff; }

    .kpi-row {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px; margin-bottom: 12px;
    }
    .kpi { padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
    .kpi span {
      font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: var(--color-text-muted);
    }
    .kpi strong {
      font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800;
      color: var(--color-text-primary); letter-spacing: -0.02em;
    }
    .kpi small { font-size: 11px; color: var(--color-text-secondary); }
    .kpi.warn { border-color: color-mix(in srgb, var(--color-warning) 35%, var(--color-border)); }
    .kpi.danger { border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border)); }

    .mobile-list { display: flex; flex-direction: column; gap: 10px; }
    .purchase-card { padding: 14px; display: flex; flex-direction: column; gap: 6px; }
    .purchase-card.draft { border-left: 3px solid var(--color-warning); }

    .card-top {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 4px;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .amount-block { text-align: right; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
    .amount-block strong {
      font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: var(--color-text-primary);
    }
    .due { font-size: 11px; font-weight: 700; color: var(--color-danger); }

    .party {
      margin: 0; font-size: 15px; font-weight: 750; color: var(--color-text-primary);
      line-height: 1.25; word-break: break-word;
    }
    .item { margin: 0; font-size: 13px; font-weight: 650; color: var(--color-text-secondary); }
    .meta { margin: 0; font-size: 12px; color: var(--color-text-muted); line-height: 1.4; }

    .progress { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
    .progress-bar {
      height: 6px; border-radius: 999px; background: var(--color-surface-raised); overflow: hidden;
    }
    .progress-bar i { display: block; height: 100%; background: var(--color-success); border-radius: inherit; }
    .progress span { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }

    .card-actions {
      display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 10px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .card-actions .btn { flex: 1; min-height: 44px; }
    .icon-btn {
      width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-secondary); display: inline-flex; align-items: center;
      justify-content: center; cursor: pointer; padding: 0;
    }
    .icon-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .icon-btn.danger { color: var(--color-danger); }
    .settled {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--color-success); font-size: 13px; font-weight: 700;
    }
    .settled mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .table-only { display: none; }
    .purchase-table { width: 100%; }
    .party-name { font-weight: 650; }
    .created-by, .commodity-lbl, .bags-value { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
    .variety-lbl, .weight-value, .net-payable-amt { font-weight: 650; }
    .amount-paid-amt { font-size: 11px; color: var(--color-success); margin-top: 2px; }

    .empty-state, .loading-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; padding: 48px 20px; text-align: center; color: var(--color-text-muted);
    }
    .empty-state h2 {
      margin: 0; font-family: var(--font-heading); font-size: 1.1rem; color: var(--color-text-primary);
    }
    .empty-state p { margin: 0; max-width: 34ch; font-size: 13px; line-height: 1.45; }
    .empty-state mat-icon, .loading-state mat-icon {
      font-size: 42px; width: 42px; height: 42px; color: var(--color-border);
    }

    .fab {
      position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      z-index: 40; width: 56px; height: 56px; border: none; border-radius: 18px;
      background: var(--color-primary); color: #fff;
      box-shadow: 0 8px 24px var(--color-primary-shadow);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .fab mat-icon { font-size: 26px; width: 26px; height: 26px; }

    .purchase-form, .pay-form { display: flex; flex-direction: column; gap: 2px; }

    .billing-summary {
      background: var(--color-surface-raised);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      margin: 8px 0 4px;
    }
    .billing-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 10px;
    }
    .billing-grid { display: flex; flex-direction: column; gap: 8px; }
    .billing-item {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; font-size: 13px; color: var(--color-text-secondary);
    }
    .billing-item .lbl { flex: 1; min-width: 0; line-height: 1.35; }
    .val { font-weight: 650; white-space: nowrap; }
    .text-negative { color: var(--color-danger); }
    .text-primary { color: var(--color-primary-dark); }
    .grand-total {
      border-top: 1px solid var(--color-border); padding-top: 10px; margin-top: 4px;
      font-size: 14px; font-weight: 700; color: var(--color-text-primary);
    }
    .grand-total .val { font-size: 16px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 900px) {
      .purchase-page { padding-bottom: 24px; }
      .desktop-add { display: inline-flex; }
      .fab { display: none; }
      .mobile-list { display: none; }
      .table-only { display: block; }
      .toolbar {
        position: static; flex-direction: row; align-items: center; gap: 14px;
      }
      .search-box { flex: 0 1 320px; }
      .type-scroll { flex: 1; }
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
  filterStatus: PurchaseFilter = '';
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

  get draftCount(): number {
    return this.purchases.filter(p => !p.confirmed).length;
  }

  get unpaidConfirmedCount(): number {
    return this.purchases.filter(p => p.confirmed && p.paymentStatus !== 'PAID').length;
  }

  get dueTotal(): number {
    return this.purchases
      .filter(p => p.confirmed && p.paymentStatus !== 'PAID')
      .reduce((sum, p) => sum + this.dueOf(p), 0);
  }

  countStatus(status: string): number {
    return this.purchases.filter(p => p.confirmed && p.paymentStatus === status).length;
  }

  dueOf(p: Purchase): number {
    return Math.max(0, (p.netPayable || 0) - (p.amountPaid || 0));
  }

  paidPct(p: Purchase): number {
    if (!p.netPayable) return 0;
    return Math.min(100, Math.round((p.amountPaid / p.netPayable) * 100));
  }

  loadPurchases() {
    this.loading = true;
    this.purchaseService.getAll().subscribe({
      next: res => {
        this.purchases = res.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadSuppliers() {
    this.partyService.getAll('AADHTI').subscribe({
      next: res => this.suppliers = res.data || []
    });
  }

  loadCommodities() {
    this.commodityService.getAll().subscribe({
      next: res => this.commodities = res.data || []
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
        next: res => this.varieties = res.data || []
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
    const q = this.searchText.trim().toLowerCase();
    this.filteredPurchases = this.purchases.filter(p => {
      let statusOk = true;
      if (this.filterStatus === 'DRAFT') statusOk = !p.confirmed;
      else if (this.filterStatus) statusOk = p.confirmed && p.paymentStatus === this.filterStatus;

      const searchOk = !q
        || p.partyName.toLowerCase().includes(q)
        || p.commodityName.toLowerCase().includes(q)
        || p.commodityVarietyName.toLowerCase().includes(q)
        || String(p.id).includes(q);
      return statusOk && searchOk;
    });
  }

  setFilterStatus(status: PurchaseFilter) {
    this.filterStatus = status;
    this.applyFilters();
  }

  onSearch(event: Event) {
    this.searchText = (event.target as HTMLInputElement).value || '';
    this.applyFilters();
  }

  clearSearch() {
    this.searchText = '';
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
    if (!confirm(`Confirm purchase from ${purchase.partyName}? Stock will increase by ${purchase.weightQuintals} qtl.`)) return;

    this.purchaseService.confirm(purchase.id).subscribe({
      next: () => {
        this.snackBar.open('Purchase confirmed & stock updated', 'Close', { duration: 3000 });
        this.loadPurchases();
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to confirm purchase', 'Close', { duration: 4000 });
      }
    });
  }

  deletePurchase(purchase: Purchase) {
    if (!confirm(`Delete draft purchase #${purchase.id}?`)) return;

    this.purchaseService.delete(purchase.id).subscribe({
      next: () => {
        this.snackBar.open('Draft purchase deleted', 'Close', { duration: 2000 });
        this.loadPurchases();
      }
    });
  }

  openPayForm(purchase: Purchase) {
    const due = this.dueOf(purchase);
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
