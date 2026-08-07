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
import { SaleService } from '../../core/services/sale.service';
import { PartyService } from '../../core/services/party.service';
import { CommodityService } from '../../core/services/commodity.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { Sale, Party, Commodity, CommodityVariety } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type SaleFilter = '' | 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

@Component({
  selector: 'app-sale-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule,
    MatSnackBarModule, StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="sale-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'sale.title' | t }}</h1>
          <p class="page-subtitle">{{ 'sale.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary desktop-add" type="button" (click)="openForm()" id="btn-add-sale">
          <mat-icon>point_of_sale</mat-icon>
          {{ 'sale.record' | t }}
        </button>
      </header>

      <!-- Sticky toolbar -->
      <section class="toolbar card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input
            type="search"
            [placeholder]="'action.search' | t"
            [value]="searchTerm"
            (input)="onSearch($event)"
            id="search-sale"
            autocomplete="off" />
          <button type="button" class="clear-btn" *ngIf="searchTerm" (click)="clearSearch()" aria-label="Clear">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="type-scroll" role="tablist">
          <button type="button" class="chip" [class.active]="filterStatus === ''" (click)="setFilterStatus('')">
            {{ 'filter.all' | t }} <em>{{ sales.length }}</em>
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

      <!-- KPI strip -->
      <section class="kpi-row" *ngIf="!loading && sales.length">
        <div class="kpi card warn" *ngIf="draftCount">
          <span>Drafts</span>
          <strong>{{ draftCount }}</strong>
          <small>Need confirm</small>
        </div>
        <div class="kpi card danger" *ngIf="dueTotal > 0">
          <span>Due to collect</span>
          <strong>₹{{ dueTotal | number:'1.0-0' }}</strong>
          <small>{{ unpaidConfirmedCount }} bills</small>
        </div>
        <div class="kpi card">
          <span>Showing</span>
          <strong>{{ filteredSales.length }}</strong>
          <small>sale{{ filteredSales.length === 1 ? '' : 's' }}</small>
        </div>
      </section>

      <div *ngIf="loading" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading sales…</span>
      </div>

      <ng-container *ngIf="!loading">
        <!-- Mobile cards -->
        <div class="mobile-list" *ngIf="filteredSales.length; else emptyState">
          <article class="sale-card card" *ngFor="let s of filteredSales" [class.draft]="!s.confirmed">
            <div class="card-top">
              <div class="badges">
                <app-status-badge [kind]="s.paymentStatus"></app-status-badge>
                <app-status-badge *ngIf="s.confirmed" kind="STOCK_OUT" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!s.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </div>
              <div class="amount-block">
                <strong>₹{{ s.totalAmount | number:'1.0-0' }}</strong>
                <span class="due" *ngIf="s.confirmed && dueOf(s) > 0">due ₹{{ dueOf(s) | number:'1.0-0' }}</span>
              </div>
            </div>

            <h3 class="buyer">{{ s.buyerName }}</h3>
            <p class="item">{{ s.commodityVarietyName }} · {{ s.commodityName }}</p>
            <p class="meta">
              {{ s.saleDate | date:'dd MMM yyyy' }}
              · {{ s.saleType === 'FOB' ? 'FOB' : 'Rate' }}
              · {{ s.quantityQuintals | number:'1.2-2' }} qtl
              · {{ s.bags }} bags
            </p>

            <div class="progress" *ngIf="s.confirmed && s.totalAmount > 0">
              <div class="progress-bar">
                <i [style.width.%]="receivedPct(s)"></i>
              </div>
              <span>Recv ₹{{ s.amountReceived | number:'1.0-0' }} / ₹{{ s.totalAmount | number:'1.0-0' }}</span>
            </div>

            <div class="card-actions">
              <ng-container *ngIf="!s.confirmed">
                <button type="button" class="btn btn-primary" (click)="confirmSale(s)">
                  <mat-icon>done_all</mat-icon> Confirm
                </button>
                <button type="button" class="icon-btn" (click)="editSale(s)" aria-label="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button type="button" class="icon-btn danger" (click)="deleteSale(s)" aria-label="Delete">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </ng-container>
              <ng-container *ngIf="s.confirmed && s.paymentStatus !== 'PAID'">
                <button type="button" class="btn btn-primary" (click)="openReceiptForm(s)">
                  <mat-icon>payments</mat-icon> Receive ₹{{ dueOf(s) | number:'1.0-0' }}
                </button>
              </ng-container>
              <ng-container *ngIf="s.confirmed && s.paymentStatus === 'PAID'">
                <span class="settled"><mat-icon>verified</mat-icon> Settled</span>
              </ng-container>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="empty-state card">
            <mat-icon>sell</mat-icon>
            <h2>{{ searchTerm || filterStatus ? 'No matches' : 'No sales yet' }}</h2>
            <p *ngIf="!searchTerm && !filterStatus">Record a draft sale, confirm to reduce stock, then collect receipts.</p>
            <p *ngIf="searchTerm || filterStatus">Try another search or filter.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()" *ngIf="!searchTerm && !filterStatus">
              <mat-icon>point_of_sale</mat-icon>
              {{ 'sale.record' | t }}
            </button>
          </div>
        </ng-template>

        <!-- Desktop table -->
        <div class="card table-only table-scroll" *ngIf="filteredSales.length">
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
                  <button mat-menu-item type="button" *ngIf="!s.confirmed" (click)="editSale(s)">
                    <mat-icon>edit</mat-icon><span>{{ 'sale.editDraft' | t }}</span>
                  </button>
                  <button mat-menu-item type="button" *ngIf="!s.confirmed" (click)="confirmSale(s)">
                    <mat-icon>done</mat-icon><span>{{ 'sale.confirm' | t }}</span>
                  </button>
                  <button mat-menu-item type="button" *ngIf="!s.confirmed" (click)="deleteSale(s)" class="text-danger">
                    <mat-icon>delete_outline</mat-icon><span>{{ 'sale.deleteDraft' | t }}</span>
                  </button>
                  <button mat-menu-item type="button" *ngIf="s.confirmed && s.paymentStatus !== 'PAID'" (click)="openReceiptForm(s)">
                    <mat-icon>payments</mat-icon><span>{{ 'sale.receipt' | t }}</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <button type="button" class="fab" (click)="openForm()" id="btn-add-sale-mobile" aria-label="Record sale">
        <mat-icon>point_of_sale</mat-icon>
      </button>

      <!-- Create / edit sale -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card sale-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ editingSale ? ('sale.editDraft' | t) : ('sale.record' | t) }}</h3>
            <button mat-icon-button type="button" (click)="closeForm()" aria-label="Close"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="saleForm" (ngSubmit)="saveSale()" class="sale-form">
            <div class="form-section">
              <div class="form-section-title">Sale type</div>
              <div class="type-picker">
                <button type="button" class="type-option" [class.active]="saleForm.value.saleType === 'RATE_BASED'"
                        (click)="setSaleType('RATE_BASED')">
                  <mat-icon>straighten</mat-icon>
                  <span>Rate-based</span>
                  <small>Qty × rate</small>
                </button>
                <button type="button" class="type-option" [class.active]="saleForm.value.saleType === 'FOB'"
                        (click)="setSaleType('FOB')">
                  <mat-icon>local_shipping</mat-icon>
                  <span>FOB</span>
                  <small>Buyer terms</small>
                </button>
              </div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Sale date *</mat-label>
                <input matInput type="date" formControlName="saleDate" id="sale-date">
              </mat-form-field>
            </div>

            <div class="form-section">
              <div class="form-section-title">Party &amp; stock</div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Buyer *</mat-label>
                <mat-select formControlName="buyerId" id="sale-buyer">
                  <mat-option *ngFor="let p of buyers" [value]="p.id">{{ p.name }} ({{ p.type }})</mat-option>
                </mat-select>
              </mat-form-field>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Commodity *</mat-label>
                  <mat-select formControlName="commodityId" (selectionChange)="onCommodityChange()" id="sale-commodity">
                    <mat-option *ngFor="let c of commodities" [value]="c.id">{{ c.name }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Variety *</mat-label>
                  <mat-select formControlName="commodityVarietyId" id="sale-variety">
                    <mat-option *ngFor="let v of varieties" [value]="v.id">{{ v.name }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Quantity (qtl) *</mat-label>
                  <input matInput type="number" step="0.001" formControlName="quantityQuintals" id="sale-qty" inputmode="decimal">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Bags</mat-label>
                  <input matInput type="number" formControlName="bags" id="sale-bags" inputmode="numeric">
                </mat-form-field>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-title">Pricing</div>
              <mat-form-field appearance="outline" class="w-full"
                *ngIf="saleForm.value.saleType === 'RATE_BASED' || saleForm.value.ratePerQuintal != null">
                <mat-label>Rate ₹/qtl {{ saleForm.value.saleType === 'RATE_BASED' ? '*' : '(optional)' }}</mat-label>
                <input matInput type="number" step="0.01" formControlName="ratePerQuintal" id="sale-rate" inputmode="decimal">
              </mat-form-field>

              <ng-container *ngIf="saleForm.value.saleType === 'FOB'">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>FOB details *</mat-label>
                  <textarea matInput rows="2" formControlName="fobDetails" id="sale-fob"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Total ₹ (if no rate)</mat-label>
                  <input matInput type="number" step="0.01" formControlName="totalAmount" id="sale-total" inputmode="decimal">
                </mat-form-field>
              </ng-container>

              <div class="estimate" *ngIf="estimateTotal != null">
                <span>Estimated total</span>
                <strong>₹{{ estimateTotal | number:'1.2-2' }}</strong>
              </div>
            </div>

            <div class="form-section">
              <div class="form-section-title">Charges</div>
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
                  <input matInput type="number" step="0.01" formControlName="transportCharge" inputmode="decimal">
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Labour ₹ (optional)</mat-label>
                  <input matInput type="number" step="0.01" formControlName="labourCharge" inputmode="decimal">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Remarks</mat-label>
                  <input matInput formControlName="remarks">
                </mat-form-field>
              </div>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="saleForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving…' : (editingSale ? 'Update draft' : 'Save draft') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Receipt -->
      <div class="dialog-overlay" *ngIf="showReceiptForm" (click)="closeReceiptForm()">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'sale.receipt' | t }}</h3>
            <button mat-icon-button type="button" (click)="closeReceiptForm()" aria-label="Close"><mat-icon>close</mat-icon></button>
          </div>
          <p class="dialog-context" *ngIf="receiptSale">
            {{ receiptSale.buyerName }} — due
            <strong>₹{{ dueOf(receiptSale) | number:'1.2-2' }}</strong>
          </p>
          <form [formGroup]="receiptForm" (ngSubmit)="saveReceipt()" class="pay-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Date *</mat-label>
              <input matInput type="date" formControlName="entryDate">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Amount ₹ *</mat-label>
              <input matInput type="number" step="0.01" formControlName="amount" inputmode="decimal">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks</mat-label>
              <input matInput formControlName="remarks">
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeReceiptForm()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="receiptForm.invalid || saving">
                {{ saving ? 'Saving…' : ('action.save' | t) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sale-page {
      max-width: 1100px;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }
    .desktop-add { display: none; }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface-raised);
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
    .chip.active {
      background: var(--color-primary); border-color: var(--color-primary); color: #fff;
    }
    .chip.active em { background: rgba(255,255,255,0.22); color: #fff; }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
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

    .sale-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sale-card.draft {
      border-left: 3px solid var(--color-warning);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 4px;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .amount-block {
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }
    .amount-block strong {
      font-family: var(--font-heading);
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--color-text-primary);
    }
    .due {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-danger);
    }
    .buyer {
      margin: 0;
      font-size: 15px;
      font-weight: 750;
      color: var(--color-text-primary);
      line-height: 1.25;
      word-break: break-word;
    }
    .item {
      margin: 0;
      font-size: 13px;
      font-weight: 650;
      color: var(--color-text-secondary);
    }
    .meta {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .progress {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .progress-bar {
      height: 6px;
      border-radius: 999px;
      background: var(--color-surface-raised);
      overflow: hidden;
    }
    .progress-bar i {
      display: block;
      height: 100%;
      background: var(--color-success);
      border-radius: inherit;
    }
    .progress span {
      font-size: 11px;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding-top: 10px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .card-actions .btn { flex: 1; min-height: 44px; }
    .icon-btn {
      width: 44px; height: 44px; flex-shrink: 0;
      border-radius: 12px; border: 1px solid var(--color-border);
      background: var(--color-surface); color: var(--color-text-secondary);
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; padding: 0;
    }
    .icon-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .icon-btn.danger { color: var(--color-danger); }
    .settled {
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--color-success); font-size: 13px; font-weight: 700;
    }
    .settled mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .table-only { display: none; }
    .sale-table { width: 100%; }
    .party-name, .variety-lbl, .amount { font-weight: 650; }

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
      position: fixed;
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      z-index: 40;
      width: 56px; height: 56px; border: none; border-radius: 18px;
      background: var(--color-primary); color: #fff;
      box-shadow: 0 8px 24px var(--color-primary-shadow);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .fab mat-icon { font-size: 26px; width: 26px; height: 26px; }

    .sale-form, .pay-form { display: flex; flex-direction: column; gap: 2px; }

    .type-picker {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .type-option {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; min-height: 84px; padding: 12px 8px; border-radius: 14px;
      border: 1.5px solid var(--color-border); background: var(--color-surface-raised);
      color: var(--color-text-secondary); cursor: pointer; font-family: inherit;
    }
    .type-option span { font-size: 13px; font-weight: 750; }
    .type-option small { font-size: 11px; color: var(--color-text-muted); }
    .type-option mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .type-option.active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
    }

    .estimate {
      display: flex; justify-content: space-between; align-items: center;
      margin: 4px 0 8px; padding: 12px 14px; border-radius: 12px;
      background: var(--color-surface-raised); border: 1px dashed var(--color-border);
    }
    .estimate span {
      font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: var(--color-text-muted);
    }
    .estimate strong {
      font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800;
      color: var(--color-primary-dark);
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 900px) {
      .sale-page { padding-bottom: 24px; }
      .desktop-add { display: inline-flex; }
      .fab { display: none; }
      .mobile-list { display: none; }
      .table-only { display: block; }
      .toolbar {
        position: static;
        flex-direction: row;
        align-items: center;
        gap: 14px;
      }
      .search-box { flex: 0 1 320px; }
      .type-scroll { flex: 1; }
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
  filterStatus: SaleFilter = '';
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

  get draftCount(): number {
    return this.sales.filter(s => !s.confirmed).length;
  }

  get unpaidConfirmedCount(): number {
    return this.sales.filter(s => s.confirmed && s.paymentStatus !== 'PAID').length;
  }

  get dueTotal(): number {
    return this.sales
      .filter(s => s.confirmed && s.paymentStatus !== 'PAID')
      .reduce((sum, s) => sum + this.dueOf(s), 0);
  }

  get estimateTotal(): number | null {
    const v = this.saleForm?.value;
    if (!v) return null;
    const qty = Number(v.quantityQuintals);
    const rate = Number(v.ratePerQuintal);
    const transport = Number(v.transportCharge) || 0;
    const labour = v.labourCharge != null && v.labourCharge !== '' ? Number(v.labourCharge) : 0;
    if (v.saleType === 'RATE_BASED' && qty > 0 && rate > 0) {
      return qty * rate + transport + labour;
    }
    if (v.saleType === 'FOB') {
      if (rate > 0 && qty > 0) return qty * rate + transport + labour;
      const total = Number(v.totalAmount);
      if (total > 0) return total + transport + labour;
    }
    return null;
  }

  countStatus(status: string): number {
    return this.sales.filter(s => s.confirmed && s.paymentStatus === status).length;
  }

  dueOf(s: Sale): number {
    return Math.max(0, (s.totalAmount || 0) - (s.amountReceived || 0));
  }

  receivedPct(s: Sale): number {
    if (!s.totalAmount) return 0;
    return Math.min(100, Math.round((s.amountReceived / s.totalAmount) * 100));
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
    this.searchTerm = (event.target as HTMLInputElement).value || '';
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  setFilterStatus(status: SaleFilter) {
    this.filterStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredSales = this.sales.filter(s => {
      let statusOk = true;
      if (this.filterStatus === 'DRAFT') statusOk = !s.confirmed;
      else if (this.filterStatus) statusOk = s.confirmed && s.paymentStatus === this.filterStatus;

      const searchOk = !q
        || s.buyerName.toLowerCase().includes(q)
        || s.commodityName.toLowerCase().includes(q)
        || s.commodityVarietyName.toLowerCase().includes(q)
        || String(s.id).includes(q);
      return statusOk && searchOk;
    });
  }

  setSaleType(type: 'RATE_BASED' | 'FOB') {
    this.saleForm.patchValue({ saleType: type });
    this.onSaleTypeChange();
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
    if (!confirm(`Confirm sale to ${sale.buyerName}? Stock will be reduced.`)) return;
    this.saleService.confirm(sale.id).subscribe({
      next: () => {
        this.snackBar.open('Sale confirmed — stock reduced', 'Close', { duration: 2500 });
        this.loadSales();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Confirm failed', 'Close', { duration: 4000 })
    });
  }

  deleteSale(sale: Sale) {
    if (!confirm(`Delete draft sale #${sale.id}?`)) return;
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
    const due = this.dueOf(sale);
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
