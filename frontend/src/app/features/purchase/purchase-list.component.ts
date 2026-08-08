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
import { Purchase, PurchaseRequest, Party, Commodity, CommodityVariety, CommoditySettings, PurchaseType } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

type PurchaseFilter = '' | 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
type PurchaseTypeFilter = '' | PurchaseType;
type PurchaseSortColumn = 'date' | 'party' | 'amount' | 'weight' | 'type';
type PurchaseSortDirection = 'asc' | 'desc';
type PurchaseConfirmAction = 'confirm' | 'delete';

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
        <div class="header-copy">
          <h1 class="page-title">{{ 'purchase.title' | t }}</h1>
          <p class="page-subtitle">{{ 'purchase.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary desktop-add" type="button" (click)="openForm()" id="btn-add-purchase">
          <mat-icon>add_shopping_cart</mat-icon>
          {{ 'purchase.record' | t }}
        </button>
      </header>

      <section class="stats-strip" *ngIf="!loading && purchases.length">
        <div class="stat-pill card">
          <mat-icon>inventory_2</mat-icon>
          <div>
            <strong>{{ purchases.length }}</strong>
            <span>Total</span>
          </div>
        </div>
        <div class="stat-pill card warn" *ngIf="draftCount">
          <mat-icon>edit_note</mat-icon>
          <div>
            <strong>{{ draftCount }}</strong>
            <span>Drafts</span>
          </div>
        </div>
        <div class="stat-pill card danger" *ngIf="dueTotal > 0">
          <mat-icon>account_balance_wallet</mat-icon>
          <div>
            <strong>₹{{ dueTotal | number:'1.0-0' }}</strong>
            <span>Due</span>
          </div>
        </div>
        <div class="stat-pill card">
          <mat-icon>filter_list</mat-icon>
          <div>
            <strong>{{ filteredPurchases.length }}</strong>
            <span>Showing</span>
          </div>
        </div>
      </section>

      <section class="toolbar card">
        <div class="toolbar-main">
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
          <div class="toolbar-actions">
            <button
              type="button"
              class="tool-btn"
              [class.active]="showFilterPanel || hasActiveFilters"
              (click)="toggleFilters()"
              aria-label="Filters">
              <mat-icon>tune</mat-icon>
              <span class="tool-label">Filters</span>
              <em class="filter-dot" *ngIf="hasActiveFilters && !showFilterPanel"></em>
            </button>
          </div>
        </div>

        <div class="filter-panel" [class.open]="showFilterPanel">
          <div class="filter-panel-inner">
            <button
              type="button"
              class="clear-filters-btn"
              [class.visible]="hasActiveFilters"
              [disabled]="!hasActiveFilters"
              (click)="clearAllFilters()">
              Clear all
            </button>

            <div class="chip-row" role="tablist" aria-label="Payment status">
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

            <div class="chip-row type-row" role="tablist" aria-label="Purchase type">
              <button type="button" class="chip type-chip" [class.active]="filterPurchaseType === ''" (click)="setFilterPurchaseType('')">
                {{ 'purchase.filter.allTypes' | t }} <em>{{ purchases.length }}</em>
              </button>
              <button type="button" class="chip type-chip" [class.active]="filterPurchaseType === 'DIRECT'" (click)="setFilterPurchaseType('DIRECT')">
                {{ 'status.DIRECT' | t }} <em>{{ countPurchaseType('DIRECT') }}</em>
              </button>
              <button type="button" class="chip type-chip" [class.active]="filterPurchaseType === 'INDIRECT'" (click)="setFilterPurchaseType('INDIRECT')">
                {{ 'status.INDIRECT' | t }} <em>{{ countPurchaseType('INDIRECT') }}</em>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div *ngIf="loading" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading purchases…</span>
      </div>

      <ng-container *ngIf="!loading">
        <div class="purchase-list" *ngIf="filteredPurchases.length; else emptyState">
          <article
            class="purchase-card card"
            *ngFor="let p of filteredPurchases"
            [class.draft]="!p.confirmed"
            [class.expanded]="expandedPurchaseId === p.id">
            <button type="button" class="card-hit" (click)="toggleExpand(p)" [attr.aria-expanded]="expandedPurchaseId === p.id">
              <div class="compact-top">
                <div class="compact-main">
                  <span class="compact-party">{{ p.partyName }}</span>
                  <span class="compact-meta">
                    #{{ p.id }} · {{ p.purchaseDate | date:'dd MMM' }}
                    · {{ p.weightQuintals | number:'1.1-1' }} qtl · {{ p.bags }} bags
                    · ₹{{ p.ratePerQuintal | number:'1.0-0' }}/qtl
                  </span>
                  <span class="compact-commodity">{{ p.commodityVarietyName }} · {{ p.commodityName }}</span>
                </div>
                <div class="compact-end">
                  <strong class="compact-amt">₹{{ p.netPayable | number:'1.0-0' }}</strong>
                  <span class="compact-due" *ngIf="p.confirmed && dueOf(p) > 0">Due ₹{{ dueOf(p) | number:'1.0-0' }}</span>
                  <mat-icon class="compact-chev">{{ expandedPurchaseId === p.id ? 'expand_less' : 'chevron_right' }}</mat-icon>
                </div>
              </div>

              <div class="compact-badges">
                <app-status-badge [kind]="purchaseTypeOf(p)" [icon]="purchaseTypeIcon(p)"></app-status-badge>
                <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
                <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </div>

              <div class="compact-progress" *ngIf="p.confirmed && p.netPayable > 0 && p.paymentStatus !== 'PAID'">
                <i [style.width.%]="paidPct(p)"></i>
              </div>
            </button>

            <div class="row-expand" *ngIf="expandedPurchaseId === p.id" (click)="$event.stopPropagation()">
              <div class="expand-grid">
                <section class="expand-col">
                  <h4 class="section-label">{{ 'purchase.billing' | t }}</h4>
                  <div class="receipt">
                    <div class="receipt-row" *ngFor="let line of billingLines(p)" [class.deduction]="line.negative" [class.total]="line.total" [class.subdued]="line.subdued">
                      <span class="receipt-label">{{ line.label }}</span>
                      <span class="receipt-value" [class.negative]="line.negative" [class.emphasis]="line.total">
                        <ng-container *ngIf="line.negative">−</ng-container>₹{{ line.amount | number:'1.2-2' }}
                      </span>
                    </div>
                  </div>
                </section>
                <section class="expand-col side" *ngIf="hasExpandMeta(p)">
                  <h4 class="section-label">{{ 'purchase.details' | t }}</h4>
                  <div class="expand-meta">
                    <p class="meta-line" *ngIf="p.transportNumber"><mat-icon>local_shipping</mat-icon>{{ p.transportNumber }}</p>
                    <p class="meta-line" *ngIf="p.createdByFullName"><mat-icon>person</mat-icon>{{ p.createdByFullName }}</p>
                    <p class="meta-line notes" *ngIf="p.remarks"><mat-icon>notes</mat-icon>{{ p.remarks }}</p>
                  </div>
                </section>
              </div>
            </div>

            <div class="card-actions compact-actions">
              <ng-container *ngIf="!p.confirmed">
                <button type="button" class="icon-btn sm" (click)="editPurchase(p)" aria-label="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button type="button" class="btn btn-primary btn-sm flex-grow" (click)="confirmPurchase(p)">
                  <mat-icon>done_all</mat-icon> Confirm
                </button>
                <button type="button" class="icon-btn sm danger" (click)="deletePurchase(p)" aria-label="Delete">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </ng-container>
              <ng-container *ngIf="p.confirmed && p.paymentStatus !== 'PAID'">
                <button type="button" class="btn btn-primary btn-sm btn-block" (click)="openPayForm(p)">
                  <mat-icon>payments</mat-icon> Pay ₹{{ dueOf(p) | number:'1.0-0' }}
                </button>
              </ng-container>
              <ng-container *ngIf="p.confirmed && p.paymentStatus === 'PAID'">
                <span class="settled compact-settled"><mat-icon>verified</mat-icon> {{ 'purchase.settled' | t }}</span>
              </ng-container>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="empty-state card">
            <mat-icon>shopping_bag</mat-icon>
            <h2>{{ hasActiveFilters ? 'No matches' : 'No purchases yet' }}</h2>
            <p *ngIf="!hasActiveFilters">Record a draft purchase, confirm to add stock, then pay the aadhti.</p>
            <p *ngIf="hasActiveFilters">Try another search or filter.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()" *ngIf="!hasActiveFilters">
              <mat-icon>add_shopping_cart</mat-icon>
              {{ 'purchase.record' | t }}
            </button>
          </div>
        </ng-template>

        <div class="card table-only table-scroll" *ngIf="filteredPurchases.length">
          <table mat-table [dataSource]="tableRows" class="purchase-table" multiTemplateDataRows>
            <ng-container matColumnDef="expand">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" (click)="toggleExpand(row, $event)" [attr.aria-expanded]="expandedPurchaseId === row.id">
                  <mat-icon>{{ expandedPurchaseId === row.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('date')">
                Date
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'date'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let p">{{ p.purchaseDate | date:'dd MMM yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('type')">
                Type
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'type'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let p">
                <app-status-badge [kind]="purchaseTypeOf(p)" [icon]="purchaseTypeIcon(p)"></app-status-badge>
              </td>
            </ng-container>
            <ng-container matColumnDef="party">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('party')">
                Aadhti
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'party'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let p">
                <div class="party-name-cell">#{{ p.id }} · {{ p.partyName }}</div>
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
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('weight')">
                Weight / Bags
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'weight'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
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
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('amount')">
                Net Payable
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'amount'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let p">
                <div class="net-payable-amt">₹{{ p.netPayable | number:'1.2-2' }}</div>
                <div class="amount-paid-amt" *ngIf="p.amountPaid > 0">Paid: ₹{{ p.amountPaid | number:'1.2-2' }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Payment</th>
              <td mat-cell *matCellDef="let p">
                <div class="status-stack">
                  <app-status-badge [kind]="p.paymentStatus"></app-status-badge>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="confirmed">
              <th mat-header-cell *matHeaderCellDef>Stock</th>
              <td mat-cell *matCellDef="let p">
                <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
              </td>
            </ng-container>
            <ng-container matColumnDef="expandedDetail">
              <td mat-cell *matCellDef="let row" [attr.colspan]="displayedColumns.length" class="expand-cell">
                <div class="row-expand table-expand">
                  <div class="expand-grid">
                    <section class="expand-col billing">
                      <h4 class="section-label">{{ 'purchase.billing' | t }}</h4>
                      <div class="receipt receipt-cols compact">
                        <div
                          class="receipt-row"
                          *ngFor="let line of billingLines(row.purchase)"
                          [class.deduction]="line.negative"
                          [class.total]="line.total"
                          [class.subdued]="line.subdued"
                          [class.span-full]="line.spanFull || line.total">
                          <span class="receipt-label">{{ line.label }}</span>
                          <span class="receipt-value" [class.negative]="line.negative" [class.emphasis]="line.total">
                            <ng-container *ngIf="line.negative">−</ng-container>₹{{ line.amount | number:'1.2-2' }}
                          </span>
                        </div>
                      </div>
                    </section>
                    <section class="expand-col side">
                      <h4 class="section-label">{{ 'purchase.details' | t }}</h4>
                      <div class="expand-meta" *ngIf="hasExpandMeta(row.purchase); else noMeta">
                        <p class="meta-line" *ngIf="row.purchase.transportNumber"><mat-icon>local_shipping</mat-icon>{{ row.purchase.transportNumber }}</p>
                        <p class="meta-line" *ngIf="row.purchase.createdByFullName"><mat-icon>person</mat-icon>{{ row.purchase.createdByFullName }}</p>
                        <p class="meta-line notes" *ngIf="row.purchase.remarks"><mat-icon>notes</mat-icon>{{ row.purchase.remarks }}</p>
                      </div>
                      <ng-template #noMeta>
                        <p class="files-empty">{{ 'purchase.noExtraDetails' | t }}</p>
                      </ng-template>
                      <div class="expand-actions-col">
                        <ng-container *ngIf="!row.purchase.confirmed">
                          <button type="button" class="btn btn-ghost btn-sm" (click)="editPurchase(row.purchase); $event.stopPropagation()">
                            <mat-icon>edit</mat-icon> {{ 'purchase.edit' | t }}
                          </button>
                          <button type="button" class="btn btn-primary btn-sm" (click)="confirmPurchase(row.purchase); $event.stopPropagation()">
                            <mat-icon>done</mat-icon> {{ 'purchase.confirmShort' | t }}
                          </button>
                        </ng-container>
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          *ngIf="row.purchase.confirmed && row.purchase.paymentStatus !== 'PAID'"
                          (click)="openPayForm(row.purchase); $event.stopPropagation()">
                          <mat-icon>payments</mat-icon> {{ 'action.pay' | t }} ₹{{ dueOf(row.purchase) | number:'1.0-0' }}
                        </button>
                        <span class="settled compact-settled" *ngIf="row.purchase.confirmed && row.purchase.paymentStatus === 'PAID'">
                          <mat-icon>verified</mat-icon> {{ 'purchase.settled' | t }}
                        </span>
                      </div>
                    </section>
                  </div>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu" [attr.id]="'purchase-action-' + p.id" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" *ngIf="!p.confirmed" (click)="editPurchase(p)">
                    <mat-icon>edit</mat-icon><span>Edit Draft</span>
                  </button>
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
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns; when: isDataRow"
              class="data-row"
              [class.expanded-row]="expandedPurchaseId === row.id"
              (click)="toggleExpand(row)"></tr>
            <tr mat-row *matRowDef="let row; columns: ['expandedDetail']; when: isDetailRow" class="detail-row"></tr>
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
            <h3>{{ editingPurchase ? 'Edit purchase draft' : ('purchase.record' | t) }}</h3>
            <button mat-icon-button type="button" (click)="closeForm()" aria-label="Close"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="purchaseForm" (ngSubmit)="savePurchase()" class="purchase-form">
            <div class="form-section">
              <div class="form-section-title">Purchase type</div>
              <div class="type-toggle" role="group" aria-label="Purchase type">
                <button type="button" class="type-btn" [class.active]="purchaseForm.value.purchaseType === 'DIRECT'" (click)="setPurchaseType('DIRECT')">
                  Direct
                </button>
                <button type="button" class="type-btn" [class.active]="purchaseForm.value.purchaseType === 'INDIRECT'" (click)="setPurchaseType('INDIRECT')">
                  Indirect
                </button>
              </div>
              <p class="type-hint" *ngIf="purchaseForm.value.purchaseType === 'INDIRECT'">
                Indirect purchase: no gaushala, commission, or cash discount. Transport number is optional.
              </p>
            </div>

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
              <div class="form-row" *ngIf="purchaseForm.value.purchaseType === 'INDIRECT'">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ 'purchase.transportNumber' | t }}</mat-label>
                  <input matInput formControlName="transportNumber" id="purchase-transport" maxlength="50" [placeholder]="'purchase.transportPlaceholder' | t">
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
                <mat-form-field appearance="outline" class="w-full" *ngIf="purchaseForm.value.purchaseType === 'DIRECT'">
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
                <ng-container *ngIf="purchaseForm.value.purchaseType === 'DIRECT'">
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
                </ng-container>
                <div class="billing-item indirect-note" *ngIf="purchaseForm.value.purchaseType === 'INDIRECT'">
                  <span class="lbl">Indirect purchase — no deductions</span>
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
                {{ saving ? 'Saving…' : (editingPurchase ? 'Update draft' : 'Save draft') }}
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

      <!-- Confirm / delete -->
      <div class="dialog-overlay" *ngIf="confirmModal" (click)="closeConfirmModal()">
        <div
          class="dialog-panel card panel-sm confirm-sheet"
          id="purchase-confirm-modal"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="confirmModal.action === 'confirm' ? 'purchase-confirm-title' : 'purchase-delete-title'">
          <div class="dialog-header">
            <h3 id="purchase-confirm-title" *ngIf="confirmModal.action === 'confirm'">Confirm purchase</h3>
            <h3 id="purchase-delete-title" *ngIf="confirmModal.action === 'delete'">Delete draft</h3>
            <button mat-icon-button type="button" (click)="closeConfirmModal()" aria-label="Close" [disabled]="confirmBusy">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="dialog-body">
            <p class="confirm-copy" *ngIf="confirmModal.action === 'confirm'">
              Confirm purchase from <strong>{{ confirmModal.purchase.partyName }}</strong>?
              Stock will increase by <strong>{{ confirmModal.purchase.weightQuintals | number:'1.2-2' }} qtl</strong>.
            </p>
            <p class="confirm-copy" *ngIf="confirmModal.action === 'delete'">
              Delete draft purchase <strong>#{{ confirmModal.purchase.id }}</strong>
              from <strong>{{ confirmModal.purchase.partyName }}</strong>? This cannot be undone.
            </p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeConfirmModal()" [disabled]="confirmBusy">
                {{ 'action.cancel' | t }}
              </button>
              <button
                type="button"
                class="btn btn-primary"
                id="purchase-confirm-submit"
                *ngIf="confirmModal.action === 'confirm'"
                (click)="executeConfirmAction()"
                [disabled]="confirmBusy">
                {{ confirmBusy ? 'Confirming…' : 'Confirm & add stock' }}
              </button>
              <button
                type="button"
                class="btn btn-danger"
                id="purchase-delete-submit"
                *ngIf="confirmModal.action === 'delete'"
                (click)="executeConfirmAction()"
                [disabled]="confirmBusy">
                {{ confirmBusy ? 'Deleting…' : 'Delete draft' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .purchase-page {
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }
    .header-copy { min-width: 0; }
    .desktop-add { display: none; }

    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .stat-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      min-width: 0;
    }
    .stat-pill mat-icon {
      font-size: 20px; width: 20px; height: 20px;
      color: var(--color-text-muted); flex-shrink: 0;
    }
    .stat-pill strong {
      display: block;
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--color-text-primary);
    }
    .stat-pill span {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
    }
    .stat-pill.warn { border-color: color-mix(in srgb, var(--color-warning) 35%, var(--color-border)); }
    .stat-pill.danger { border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border)); }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 8;
      padding: 10px 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 0;
      background: color-mix(in srgb, var(--color-surface) 94%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .toolbar-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-box {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface-raised);
    }
    .search-box mat-icon { color: var(--color-text-muted); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .search-box input {
      border: none; outline: none; background: transparent; width: 100%;
      font: inherit; font-size: 16px; color: var(--color-text-primary);
    }
    .clear-btn {
      border: none; background: transparent; color: var(--color-text-muted);
      width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; border-radius: 8px; padding: 0; flex-shrink: 0;
    }
    .toolbar-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }
    .tool-btn {
      position: relative;
      min-width: 44px; height: 44px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      cursor: pointer; padding: 0 10px; font: inherit;
    }
    .tool-btn.active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
    }
    .tool-label { display: none; font-size: 12px; font-weight: 700; }
    .filter-dot {
      position: absolute; top: 8px; right: 8px;
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--color-primary);
    }

    .filter-panel {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.18s ease;
    }
    .filter-panel.open { grid-template-rows: 1fr; }
    .filter-panel-inner {
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
      padding-right: 68px;
    }
    .filter-panel.open .filter-panel-inner {
      padding-top: 4px;
      margin-top: 6px;
      border-top: 1px solid var(--color-border-subtle);
    }

    .clear-filters-btn {
      position: absolute;
      top: 4px;
      right: 0;
      display: inline-flex;
      align-items: center;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      font: inherit;
      font-size: 11px;
      font-weight: 650;
      padding: 2px 4px;
      border-radius: 6px;
      cursor: pointer;
      opacity: 0.4;
      pointer-events: none;
    }
    .clear-filters-btn.visible {
      opacity: 1;
      pointer-events: auto;
      color: var(--color-danger);
    }

    .chip-row {
      display: flex; gap: 5px; overflow-x: auto;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .chip-row::-webkit-scrollbar { display: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto;
      min-height: 26px; padding: 0 8px; border-radius: 999px;
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-secondary); cursor: pointer; font: inherit;
      font-size: 10px; font-weight: 650; white-space: nowrap;
    }
    .chip em {
      font-style: normal; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 999px;
      background: var(--color-surface-raised); font-size: 9px;
      display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-muted);
    }
    .chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .chip.active em { background: rgba(255,255,255,0.22); color: #fff; }
    .type-chip.active { background: var(--color-info); border-color: var(--color-info); }
    .type-row { padding-bottom: 2px; }

    .btn-sm { min-height: 34px; padding: 0 12px; font-size: 12px; }

    .purchase-list { display: flex; flex-direction: column; gap: 6px; }
    .purchase-card {
      padding: 0;
      overflow: hidden;
      transition: border-color 0.15s ease;
    }
    .purchase-card.draft { border-left: 3px solid var(--color-warning); }
    .purchase-card.expanded {
      border-color: color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
    }

    .card-hit {
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      padding: 10px 12px 8px;
      font: inherit;
      color: inherit;
    }

    .compact-top {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .compact-main { flex: 1; min-width: 0; }
    .compact-party {
      display: block;
      font-size: 14px;
      font-weight: 750;
      line-height: 1.2;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .compact-meta,
    .compact-commodity {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      line-height: 1.3;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .compact-commodity { color: var(--color-text-secondary); font-weight: 600; }

    .compact-end {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
      max-width: 38%;
    }
    .compact-amt {
      font-family: var(--font-heading);
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }
    .compact-due {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-danger);
      line-height: 1.2;
    }
    .compact-chev {
      margin-top: 2px;
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: var(--color-text-muted);
    }

    .compact-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .compact-badges ::ng-deep .status-badge {
      min-height: 22px;
      padding: 1px 7px 1px 6px;
      font-size: 10px;
      gap: 4px;
    }
    .compact-badges ::ng-deep .status-dot { width: 5px; height: 5px; }
    .compact-badges ::ng-deep .status-icon {
      font-size: 12px !important;
      width: 12px !important;
      height: 12px !important;
    }

    .compact-progress {
      margin-top: 6px;
      height: 3px;
      border-radius: 999px;
      background: var(--color-border-subtle);
      overflow: hidden;
    }
    .compact-progress i {
      display: block;
      height: 100%;
      background: var(--color-success);
      border-radius: inherit;
    }

    .row-expand {
      width: 100%;
      box-sizing: border-box;
      border-top: 1px solid var(--color-border-subtle);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface-raised) 88%, var(--color-surface)) 0%,
        var(--color-surface) 100%
      );
      padding: 4px 12px 14px;
    }
    .expand-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      width: 100%;
    }
    .expand-col { min-width: 0; width: 100%; }
    .section-label {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .expand-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .expand-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: var(--color-text-muted);
    }
    .expand-close {
      border: none; background: transparent; color: var(--color-text-muted);
      width: 28px; height: 28px; padding: 0; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .expand-close mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .receipt { display: flex; flex-direction: column; gap: 0; }
    .receipt.compact .receipt-row { padding: 3px 0; font-size: 12px; }
    .receipt-row {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 16px; padding: 5px 0;
      font-size: 13px; color: var(--color-text-secondary);
    }
    .receipt-row.subdued { color: var(--color-text-muted); font-size: 12px; }
    .receipt-row.deduction .receipt-value { color: var(--color-danger); }
    .receipt-row.total {
      margin-top: 6px; padding-top: 8px;
      border-top: 1px solid var(--color-border);
      font-weight: 700; color: var(--color-text-primary);
    }
    .receipt-label { flex: 1; min-width: 0; line-height: 1.35; }
    .receipt-value {
      font-variant-numeric: tabular-nums;
      font-weight: 650; white-space: nowrap; color: var(--color-text-primary);
    }
    .receipt-value.negative { color: var(--color-danger); }
    .receipt-value.emphasis { font-size: 14px; color: var(--color-primary-dark); }

    .expand-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 0;
      border: none;
    }
    .meta-line {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
      color: var(--color-text-secondary);
    }
    .meta-line mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      margin-top: 1px;
      flex-shrink: 0;
      color: var(--color-text-muted);
    }
    .meta-line.notes { color: var(--color-text-muted); }
    .files-empty {
      margin: 0 0 8px;
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .expand-cell { padding: 0 !important; border-bottom: 1px solid var(--color-border-subtle) !important; }
    .detail-row:hover { background: transparent !important; }
    .table-expand {
      padding: 10px 20px 16px 52px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .expand-actions-col {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
    }
    .expand-actions-col .btn-sm {
      min-height: 36px;
      justify-content: center;
    }

    .card-actions {
      display: flex; align-items: center; gap: 6px;
      padding: 0 10px 8px;
    }
    .compact-actions { min-height: 36px; }
    .compact-actions .btn-sm { min-height: 36px; padding: 0 10px; font-size: 12px; }
    .compact-actions .flex-grow { flex: 1; }
    .compact-settled { padding: 4px 0; font-size: 12px; }
    .icon-btn.sm {
      width: 36px; height: 36px; border-radius: 10px;
    }
    .icon-btn.sm mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-block { width: 100%; }
    .settled {
      width: 100%; justify-content: center;
      display: inline-flex; align-items: center; gap: 6px;
      color: var(--color-success); font-size: 13px; font-weight: 700;
    }
    .icon-btn {
      width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-secondary); display: inline-flex; align-items: center;
      justify-content: center; cursor: pointer; padding: 0;
    }
    .icon-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .icon-btn.danger { color: var(--color-danger); }

    .table-only { display: none; }
    .purchase-table { width: 100%; }
    .data-row { cursor: pointer; }
    .data-row.expanded-row {
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
      border-bottom-color: transparent;
    }
    .detail-row td { padding: 0 !important; }

    .sortable { cursor: pointer; user-select: none; white-space: nowrap; }
    .sortable:hover { color: var(--color-primary); }
    .sort-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      vertical-align: middle; margin-left: 2px;
    }
    .party-name-cell { font-weight: 650; }
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
      position: fixed; right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      z-index: 40; width: 56px; height: 56px; border: none; border-radius: 18px;
      background: var(--color-primary); color: #fff;
      box-shadow: 0 8px 24px var(--color-primary-shadow);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }

    .type-toggle { display: flex; gap: 8px; margin-bottom: 8px; }
    .type-btn {
      flex: 1; min-height: 44px; border-radius: 12px;
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-secondary); font: inherit; font-size: 13px; font-weight: 650;
      cursor: pointer;
    }
    .type-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .type-hint { margin: 0 0 4px; font-size: 12px; color: var(--color-text-muted); line-height: 1.4; }
    .indirect-note .lbl { font-style: italic; color: var(--color-text-muted); }
    .text-negative { color: var(--color-danger); }
    .text-primary { color: var(--color-primary-dark); }

    .billing-summary {
      background: var(--color-surface-raised);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: 12px 14px; margin: 8px 0 4px;
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
    .grand-total {
      border-top: 1px solid var(--color-border); padding-top: 10px; margin-top: 4px;
      font-size: 14px; font-weight: 700; color: var(--color-text-primary);
    }
    .grand-total .val { font-size: 16px; }

    .confirm-copy {
      margin: 0 0 12px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-secondary);
    }
    .confirm-copy strong { color: var(--color-text-primary); }
    .btn-danger {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: #fff;
    }
    .btn-danger:disabled { opacity: 0.65; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 899px) {
      .stats-strip {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 8px;
      }
      .stat-pill { padding: 8px 10px; gap: 8px; }
      .stat-pill strong { font-size: 0.9rem; }
      .stat-pill mat-icon { font-size: 18px; width: 18px; height: 18px; }
      .toolbar { padding: 8px 10px; margin-bottom: 8px; }
      .purchase-page { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)); }
    }

    @media (max-width: 420px) {
      .stats-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (min-width: 640px) {
      .tool-label { display: inline; }
      .sort-field { width: 200px; }
    }

    @media (min-width: 900px) {
      .purchase-page { padding-bottom: 24px; }
      .desktop-add { display: inline-flex; }
      .fab { display: none; }
      .purchase-list { display: none; }
      .table-only { display: block; }
      .toolbar { position: static; }
      .filter-panel-inner {
        padding-right: 76px;
        gap: 5px;
      }
      .chip { min-height: 28px; font-size: 11px; padding: 0 10px; }
      .expand-grid {
        grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.7fr);
        gap: 0;
        align-items: start;
      }
      .expand-col.side {
        padding-left: 28px;
        margin-left: 28px;
        border-left: 1px solid var(--color-border-subtle);
      }
      .table-expand { padding: 12px 24px 18px 56px; }
      .receipt.receipt-cols {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        column-gap: 36px;
        row-gap: 0;
      }
      .receipt.receipt-cols .receipt-row.span-full,
      .receipt.receipt-cols .receipt-row.total {
        grid-column: 1 / -1;
      }
      .receipt.receipt-cols .receipt-row.total {
        margin-top: 8px;
      }
    }
  `]
})
export class PurchaseListComponent implements OnInit {
  displayedColumns = ['expand', 'date', 'type', 'party', 'commodity', 'weight', 'rate', 'netPayable', 'status', 'confirmed', 'actions'];
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
  editingPurchase: Purchase | null = null;
  showPayForm = false;
  paying = false;
  payingPurchase: Purchase | null = null;
  filterStatus: PurchaseFilter = '';
  filterPurchaseType: PurchaseTypeFilter = '';
  sortColumn: PurchaseSortColumn = 'date';
  sortDirection: PurchaseSortDirection = 'desc';
  expandedPurchaseId: number | null = null;
  showFilterPanel = false;
  confirmModal: { action: PurchaseConfirmAction; purchase: Purchase } | null = null;
  confirmBusy = false;
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
    private snackBar: MatSnackBar,
    private i18n: I18nService
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    this.purchaseForm = this.fb.group({
      purchaseType: ['DIRECT' as PurchaseType],
      transportNumber: [''],
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

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterStatus || this.filterPurchaseType);
  }

  get tableRows(): Array<Purchase | { detailRow: true; purchase: Purchase }> {
    const rows: Array<Purchase | { detailRow: true; purchase: Purchase }> = [];
    for (const purchase of this.filteredPurchases) {
      rows.push(purchase);
      if (this.expandedPurchaseId === purchase.id) {
        rows.push({ detailRow: true, purchase });
      }
    }
    return rows;
  }

  isDataRow = (_index: number, row: Purchase | { detailRow: true; purchase: Purchase }): row is Purchase =>
    !('detailRow' in row);

  isDetailRow = (_index: number, row: Purchase | { detailRow: true; purchase: Purchase }): row is { detailRow: true; purchase: Purchase } =>
    'detailRow' in row && row.detailRow === true;

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

  countPurchaseType(type: PurchaseType): number {
    return this.purchases.filter(p => this.purchaseTypeOf(p) === type).length;
  }

  purchaseTypeOf(p: Purchase): PurchaseType {
    return p.purchaseType || 'DIRECT';
  }

  purchaseTypeIcon(p: Purchase): string {
    return this.purchaseTypeOf(p) === 'INDIRECT' ? 'local_shipping' : 'storefront';
  }

  toggleExpand(p: Purchase, event?: Event) {
    event?.stopPropagation();
    this.expandedPurchaseId = this.expandedPurchaseId === p.id ? null : p.id;
  }

  toggleFilters() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  clearAllFilters() {
    this.searchText = '';
    this.filterStatus = '';
    this.filterPurchaseType = '';
    this.applyFilters();
  }

  billingLines(p: Purchase): Array<{ label: string; amount: number; negative?: boolean; total?: boolean; subdued?: boolean; spanFull?: boolean }> {
    this.i18n.locale();
    const lines: Array<{ label: string; amount: number; negative?: boolean; total?: boolean; subdued?: boolean; spanFull?: boolean }> = [];

    if (this.purchaseTypeOf(p) === 'DIRECT') {
      lines.push({ label: this.i18n.t('purchase.billing.gross'), amount: p.grossAmount, subdued: true });
      if (p.gaushalaAmount > 0) {
        lines.push({
          label: `${this.i18n.t('purchase.billing.gaushala')} · ₹${p.gaushalaRate}/qtl`,
          amount: p.gaushalaAmount,
          negative: true
        });
      }
      if (p.commissionAmount > 0) {
        lines.push({
          label: `${this.i18n.t('purchase.billing.commission')} · ${p.commissionRate}%`,
          amount: p.commissionAmount,
          negative: true
        });
      }
      if (p.cashDiscountAmount > 0) {
        lines.push({
          label: `${this.i18n.t('purchase.billing.cashDiscount')} · ${p.cashDiscountPct}%`,
          amount: p.cashDiscountAmount,
          negative: true
        });
      }
    } else {
      lines.push({ label: this.i18n.t('purchase.billing.grossNoDeduction'), amount: p.grossAmount, subdued: true });
    }

    lines.push({ label: this.i18n.t('purchase.billing.netPayable'), amount: p.netPayable, total: true, spanFull: true });

    if (p.confirmed) {
      lines.push({ label: this.i18n.t('purchase.billing.paid'), amount: p.amountPaid, subdued: true, spanFull: true });
      const due = this.dueOf(p);
      if (due > 0) {
        lines.push({ label: this.i18n.t('purchase.billing.balanceDue'), amount: due, negative: true, spanFull: true });
      }
    }
    return lines;
  }

  hasExpandMeta(p: Purchase): boolean {
    return !!(p.transportNumber || p.remarks || p.createdByFullName);
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
    const purchaseType: PurchaseType = this.purchaseForm.get('purchaseType')?.value || 'DIRECT';

    if (weight > 0 && rate > 0 && (purchaseType === 'INDIRECT' || this.selectedSettings)) {
      const gross = weight * rate;

      if (purchaseType === 'INDIRECT') {
        this.bill = {
          grossAmount: Math.round(gross * 100) / 100,
          gaushalaRate: 0,
          gaushalaAmount: 0,
          commissionRate: 0,
          commissionAmount: 0,
          cashDiscountPct: 0,
          cashDiscountAmount: 0,
          netPayable: Math.round(gross * 100) / 100
        };
      } else {
        const gaushala = weight * this.selectedSettings!.gausharaRate;
        const commission = gross * (this.selectedSettings!.commissionRate / 100);
        const discount = gross * (discountPct / 100);
        const net = gross - gaushala - commission - discount;

        this.bill = {
          grossAmount: Math.round(gross * 100) / 100,
          gaushalaRate: this.selectedSettings!.gausharaRate,
          gaushalaAmount: Math.round(gaushala * 100) / 100,
          commissionRate: this.selectedSettings!.commissionRate,
          commissionAmount: Math.round(commission * 100) / 100,
          cashDiscountPct: discountPct,
          cashDiscountAmount: Math.round(discount * 100) / 100,
          netPayable: Math.round(net * 100) / 100
        };
      }
      this.billCalculated = true;

      if (this.selectedSettings) {
        const bagsInput = this.purchaseForm.get('bags')?.value;
        if (!bagsInput && this.selectedSettings.bagWeightKg > 0) {
          const weightKg = weight * 100;
          const autoBags = Math.round(weightKg / this.selectedSettings.bagWeightKg);
          this.purchaseForm.get('bags')?.setValue(autoBags, { emitEvent: false });
        }
      }
    } else {
      this.billCalculated = false;
    }
  }

  setPurchaseType(type: PurchaseType) {
    this.purchaseForm.patchValue({
      purchaseType: type,
      transportNumber: type === 'DIRECT' ? '' : this.purchaseForm.value.transportNumber,
      cashDiscountPct: type === 'INDIRECT' ? 0 : this.purchaseForm.value.cashDiscountPct
    });
    this.recalculateBill();
  }

  applyFilters() {
    const q = this.searchText.trim().toLowerCase();
    let results = this.purchases.filter(p => {
      let statusOk = true;
      if (this.filterStatus === 'DRAFT') statusOk = !p.confirmed;
      else if (this.filterStatus) statusOk = p.confirmed && p.paymentStatus === this.filterStatus;

      const typeOk = !this.filterPurchaseType || this.purchaseTypeOf(p) === this.filterPurchaseType;

      const searchOk = !q
        || p.partyName.toLowerCase().includes(q)
        || p.commodityName.toLowerCase().includes(q)
        || p.commodityVarietyName.toLowerCase().includes(q)
        || (p.transportNumber || '').toLowerCase().includes(q)
        || String(p.id).includes(q);
      return statusOk && typeOk && searchOk;
    });

    results = [...results].sort((a, b) => this.comparePurchases(a, b));
    this.filteredPurchases = results;

    if (this.expandedPurchaseId != null && !results.some(p => p.id === this.expandedPurchaseId)) {
      this.expandedPurchaseId = null;
    }
  }

  private comparePurchases(a: Purchase, b: Purchase): number {
    let cmp = 0;
    switch (this.sortColumn) {
      case 'party':
        cmp = a.partyName.localeCompare(b.partyName);
        break;
      case 'amount':
        cmp = (a.netPayable || 0) - (b.netPayable || 0);
        break;
      case 'weight':
        cmp = (a.weightQuintals || 0) - (b.weightQuintals || 0);
        break;
      case 'type':
        cmp = this.purchaseTypeOf(a).localeCompare(this.purchaseTypeOf(b));
        break;
      case 'date':
      default:
        cmp = (a.purchaseDate || '').localeCompare(b.purchaseDate || '');
        break;
    }
    if (cmp === 0) {
      cmp = b.id - a.id;
    }
    return this.sortDirection === 'asc' ? cmp : -cmp;
  }

  setFilterStatus(status: PurchaseFilter) {
    this.filterStatus = status;
    this.applyFilters();
    this.showFilterPanel = false;
  }

  setFilterPurchaseType(type: PurchaseTypeFilter) {
    this.filterPurchaseType = type;
    this.applyFilters();
    this.showFilterPanel = false;
  }

  setSortColumn(column: PurchaseSortColumn) {
    if (this.sortColumn === column) {
      this.toggleSortDirection();
      return;
    }
    this.sortColumn = column;
    this.applyFilters();
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
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
    this.editingPurchase = null;
    const todayStr = new Date().toISOString().split('T')[0];
    this.purchaseForm.reset({
      purchaseType: 'DIRECT',
      transportNumber: '',
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

  editPurchase(purchase: Purchase) {
    this.editingPurchase = purchase;
    this.purchaseForm.reset({
      purchaseType: purchase.purchaseType || 'DIRECT',
      transportNumber: purchase.transportNumber || '',
      purchaseDate: purchase.purchaseDate,
      partyId: purchase.partyId,
      commodityId: purchase.commodityId || '',
      commodityVarietyId: purchase.commodityVarietyId,
      weightQuintals: purchase.weightQuintals,
      ratePerQuintal: purchase.ratePerQuintal,
      bags: purchase.bags,
      cashDiscountPct: purchase.cashDiscountPct || 0,
      remarks: purchase.remarks || ''
    });
    this.billCalculated = false;
    this.selectedSettings = null;
    this.allowedDiscounts = [];
    this.varieties = [];

    if (purchase.commodityId) {
      this.commodityService.getVarieties(purchase.commodityId).subscribe({
        next: res => {
          this.varieties = res.data || [];
          this.commodityService.getSettings(purchase.commodityVarietyId).subscribe({
            next: settingsRes => {
              this.selectedSettings = settingsRes.data;
              this.allowedDiscounts = this.selectedSettings?.allowedCashDiscounts || [];
              this.recalculateBill();
            }
          });
        }
      });
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingPurchase = null;
  }

  private buildPurchaseRequest(): PurchaseRequest {
    const val = this.purchaseForm.value;
    const purchaseType: PurchaseType = val.purchaseType || 'DIRECT';
    const transport = (val.transportNumber || '').trim();

    return {
      purchaseDate: val.purchaseDate,
      purchaseType,
      transportNumber: purchaseType === 'INDIRECT' && transport ? transport : undefined,
      partyId: Number(val.partyId),
      commodityVarietyId: Number(val.commodityVarietyId),
      weightQuintals: Number(val.weightQuintals),
      bags: val.bags ? Number(val.bags) : undefined,
      ratePerQuintal: Number(val.ratePerQuintal),
      cashDiscountPct: purchaseType === 'DIRECT' ? Number(val.cashDiscountPct || 0) : 0,
      remarks: val.remarks || undefined
    };
  }

  savePurchase() {
    if (this.purchaseForm.invalid) return;
    this.saving = true;
    const requestData = this.buildPurchaseRequest();
    const isEdit = !!this.editingPurchase;
    const request$ = isEdit
      ? this.purchaseService.update(this.editingPurchase!.id, requestData)
      : this.purchaseService.create(requestData);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          isEdit ? 'Purchase draft updated' : 'Purchase recorded as Draft successfully',
          'Close',
          { duration: 3000, panelClass: 'snack-success' }
        );
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
    this.confirmModal = { action: 'confirm', purchase };
  }

  deletePurchase(purchase: Purchase) {
    this.confirmModal = { action: 'delete', purchase };
  }

  closeConfirmModal() {
    if (this.confirmBusy) return;
    this.confirmModal = null;
  }

  executeConfirmAction() {
    if (!this.confirmModal || this.confirmBusy) return;

    const { action, purchase } = this.confirmModal;
    this.confirmBusy = true;

    if (action === 'confirm') {
      this.purchaseService.confirm(purchase.id).subscribe({
        next: () => {
          this.confirmBusy = false;
          this.confirmModal = null;
          this.snackBar.open('Purchase confirmed & stock updated', 'Close', { duration: 3000 });
          this.loadPurchases();
        },
        error: err => {
          this.confirmBusy = false;
          this.snackBar.open(err.error?.message || 'Failed to confirm purchase', 'Close', { duration: 4000 });
        }
      });
      return;
    }

    this.purchaseService.delete(purchase.id).subscribe({
      next: () => {
        this.confirmBusy = false;
        this.confirmModal = null;
        this.snackBar.open('Draft purchase deleted', 'Close', { duration: 2000 });
        this.loadPurchases();
      },
      error: err => {
        this.confirmBusy = false;
        this.snackBar.open(err.error?.message || 'Failed to delete purchase', 'Close', { duration: 4000 });
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
