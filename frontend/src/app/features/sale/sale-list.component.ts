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
import { Sale, SaleAttachment, SaleRequest, Party, Commodity, CommodityVariety, SaleType } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

type SaleFilter = '' | 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
type SaleTypeFilter = '' | SaleType;
type SaleSortColumn = 'date' | 'buyer' | 'amount' | 'qty' | 'type';
type SaleSortDirection = 'asc' | 'desc';
type SaleConfirmAction = 'confirm' | 'delete';

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
        <div class="header-copy">
          <h1 class="page-title">{{ 'sale.title' | t }}</h1>
          <p class="page-subtitle">{{ 'sale.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary desktop-add" type="button" (click)="openForm()" id="btn-add-sale">
          <mat-icon>point_of_sale</mat-icon>
          {{ 'sale.record' | t }}
        </button>
      </header>

      <section class="stats-strip" *ngIf="!loading && sales.length">
        <div class="stat-pill card">
          <mat-icon>sell</mat-icon>
          <div>
            <strong>{{ sales.length }}</strong>
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
            <strong>{{ filteredSales.length }}</strong>
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
              id="search-sale"
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

            <div class="chip-row type-row" role="tablist" aria-label="Sale type">
              <button type="button" class="chip type-chip" [class.active]="filterSaleType === ''" (click)="setFilterSaleType('')">
                All types <em>{{ sales.length }}</em>
              </button>
              <button type="button" class="chip type-chip" [class.active]="filterSaleType === 'RATE_BASED'" (click)="setFilterSaleType('RATE_BASED')">
                Rate <em>{{ countSaleType('RATE_BASED') }}</em>
              </button>
              <button type="button" class="chip type-chip" [class.active]="filterSaleType === 'FOB'" (click)="setFilterSaleType('FOB')">
                FOB <em>{{ countSaleType('FOB') }}</em>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div *ngIf="loading" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading sales…</span>
      </div>

      <ng-container *ngIf="!loading">
        <div class="sale-list" *ngIf="filteredSales.length; else emptyState">
          <article
            class="sale-card card"
            *ngFor="let s of filteredSales"
            [class.draft]="!s.confirmed"
            [class.expanded]="expandedSaleId === s.id">
            <button type="button" class="card-hit" (click)="toggleExpand(s)" [attr.aria-expanded]="expandedSaleId === s.id">
              <div class="compact-top">
                <div class="compact-main">
                  <span class="compact-party">{{ s.buyerName }}</span>
                  <span class="compact-meta">
                    #{{ s.id }} · {{ s.saleDate | date:'dd MMM' }}
                    · {{ s.quantityQuintals | number:'1.1-1' }} qtl · {{ s.bags }} bags
                    <ng-container *ngIf="s.ratePerQuintal"> · ₹{{ s.ratePerQuintal | number:'1.0-0' }}/qtl</ng-container>
                  </span>
                  <span class="compact-commodity">{{ s.commodityVarietyName }} · {{ s.commodityName }}</span>
                </div>
                <div class="compact-end">
                  <strong class="compact-amt">₹{{ s.totalAmount | number:'1.0-0' }}</strong>
                  <span class="compact-due" *ngIf="s.confirmed && dueOf(s) > 0">Due ₹{{ dueOf(s) | number:'1.0-0' }}</span>
                  <mat-icon class="compact-chev">{{ expandedSaleId === s.id ? 'expand_less' : 'chevron_right' }}</mat-icon>
                </div>
              </div>

              <div class="compact-badges">
                <span class="type-pill">{{ s.saleType === 'FOB' ? 'FOB' : 'Rate' }}</span>
                <app-status-badge [kind]="s.paymentStatus"></app-status-badge>
                <app-status-badge *ngIf="s.confirmed" kind="STOCK_OUT" icon="check_circle"></app-status-badge>
                <app-status-badge *ngIf="!s.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
                <span class="attach-pill" *ngIf="attachmentCount(s)">
                  <mat-icon>attach_file</mat-icon>{{ attachmentCount(s) }}
                </span>
              </div>

              <div class="compact-progress" *ngIf="s.confirmed && s.totalAmount > 0 && s.paymentStatus !== 'PAID'">
                <i [style.width.%]="receivedPct(s)"></i>
              </div>
            </button>

            <div class="row-expand" *ngIf="expandedSaleId === s.id" (click)="$event.stopPropagation()">
              <div class="expand-grid">
                <section class="expand-col">
                  <h4 class="section-label">{{ 'sale.billing' | t }}</h4>
                  <div class="receipt flat">
                    <div class="receipt-row" *ngFor="let line of billingLines(s)" [class.deduction]="line.negative" [class.total]="line.total" [class.subdued]="line.subdued">
                      <span class="receipt-label">{{ line.label }}</span>
                      <span class="receipt-value" [class.negative]="line.negative" [class.emphasis]="line.total">
                        <ng-container *ngIf="line.negative">−</ng-container>₹{{ line.amount | number:'1.2-2' }}
                      </span>
                    </div>
                  </div>
                  <div class="expand-meta" *ngIf="hasExpandMeta(s)">
                    <p class="meta-line" *ngIf="s.transporterName"><mat-icon>local_shipping</mat-icon>{{ s.transporterName }}</p>
                    <p class="meta-line" *ngIf="s.transportNumber"><mat-icon>directions_car</mat-icon>{{ s.transportNumber }}</p>
                    <p class="meta-line" *ngIf="s.createdByFullName"><mat-icon>person</mat-icon>{{ s.createdByFullName }}</p>
                    <p class="meta-line notes" *ngIf="s.remarks"><mat-icon>notes</mat-icon>{{ s.remarks }}</p>
                  </div>
                </section>

                <section class="expand-col docs">
                  <div class="section-row">
                    <h4 class="section-label">{{ 'sale.documents' | t }}</h4>
                    <span class="section-count" *ngIf="attachmentCount(s)">{{ attachmentCount(s) }}</span>
                  </div>
                  <label class="upload-link" [class.busy]="attachmentBusy">
                    <input
                      type="file"
                      multiple
                      [disabled]="attachmentBusy"
                      accept="image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      (change)="onSaleFilesSelected(s, $event)" />
                    <mat-icon>add</mat-icon>
                    {{ attachmentBusy ? ('sale.uploading' | t) : ('sale.addBillFile' | t) }}
                  </label>
                  <p class="files-empty" *ngIf="!attachmentCount(s)">{{ 'sale.noDocuments' | t }}</p>
                  <div class="attachment-scroll" *ngIf="attachmentCount(s)">
                    <div class="file-row" *ngFor="let att of s.attachments">
                      <div class="file-main">
                        <mat-icon>{{ attachmentIcon(att) }}</mat-icon>
                        <div class="file-copy">
                          <span>{{ att.originalFilename }}</span>
                          <small>{{ formatFileSize(att.sizeBytes) }} · {{ formatAttachmentTime(att) }}<ng-container *ngIf="att.uploadedByFullName"> · {{ att.uploadedByFullName }}</ng-container></small>
                        </div>
                      </div>
                      <div class="file-actions">
                        <button type="button" class="icon-btn xs" *ngIf="isPreviewable(att)" (click)="viewAttachment(s, att)" aria-label="View">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button type="button" class="icon-btn xs" (click)="downloadAttachment(s, att)" aria-label="Download">
                          <mat-icon>download</mat-icon>
                        </button>
                        <button type="button" class="icon-btn xs danger" (click)="removeAttachment(s, att)" aria-label="Remove">
                          <mat-icon>delete_outline</mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div class="card-actions compact-actions">
              <ng-container *ngIf="!s.confirmed">
                <button type="button" class="icon-btn sm" (click)="editSale(s)" aria-label="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button type="button" class="btn btn-primary btn-sm flex-grow" (click)="confirmSale(s)">
                  <mat-icon>done_all</mat-icon> {{ 'sale.confirmShort' | t }}
                </button>
                <button type="button" class="icon-btn sm danger" (click)="deleteSale(s)" aria-label="Delete">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </ng-container>
              <ng-container *ngIf="s.confirmed && s.paymentStatus !== 'PAID'">
                <button type="button" class="btn btn-primary btn-sm btn-block" (click)="openReceiptForm(s)">
                  <mat-icon>payments</mat-icon> Receive ₹{{ dueOf(s) | number:'1.0-0' }}
                </button>
              </ng-container>
              <ng-container *ngIf="s.confirmed && s.paymentStatus === 'PAID'">
                <span class="settled compact-settled"><mat-icon>verified</mat-icon> {{ 'sale.settled' | t }}</span>
              </ng-container>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="empty-state card">
            <mat-icon>sell</mat-icon>
            <h2>{{ hasActiveFilters ? 'No matches' : 'No sales yet' }}</h2>
            <p *ngIf="!hasActiveFilters">Record a draft sale, attach bills, confirm to reduce stock, then collect receipts.</p>
            <p *ngIf="hasActiveFilters">Try another search or filter.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()" *ngIf="!hasActiveFilters">
              <mat-icon>point_of_sale</mat-icon>
              {{ 'sale.record' | t }}
            </button>
          </div>
        </ng-template>

        <div class="card table-only table-scroll" *ngIf="filteredSales.length">
          <table mat-table [dataSource]="tableRows" class="sale-table" multiTemplateDataRows>
            <ng-container matColumnDef="expand">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" *ngIf="isDataRow(0, row)" (click)="toggleExpand(row, $event)" [attr.aria-expanded]="expandedSaleId === row.id">
                  <mat-icon>{{ expandedSaleId === row.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('date')">
                Date
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'date'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let s">{{ s.saleDate | date:'dd MMM yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('type')">
                Type
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'type'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let s">
                <span class="type-pill table">{{ s.saleType === 'FOB' ? 'FOB' : 'Rate' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="buyer">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('buyer')">
                Buyer
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'buyer'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let s">
                <div class="party-name">#{{ s.id }} · {{ s.buyerName }}</div>
                <div class="meta" *ngIf="s.createdByFullName">By {{ s.createdByFullName }}</div>
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
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('qty')">
                Qty / Bags
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'qty'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let s">
                <div>{{ s.quantityQuintals | number:'1.3-3' }} qtl</div>
                <div class="meta">{{ s.bags }} bags</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef class="sortable" (click)="setSortColumn('amount')">
                Total
                <mat-icon class="sort-icon" *ngIf="sortColumn === 'amount'">{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              </th>
              <td mat-cell *matCellDef="let s">
                <div class="amount">₹{{ s.totalAmount | number:'1.2-2' }}</div>
                <div class="meta" *ngIf="s.amountReceived > 0">Recv: ₹{{ s.amountReceived | number:'1.2-2' }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="files">
              <th mat-header-cell *matHeaderCellDef>Files</th>
              <td mat-cell *matCellDef="let s">
                <span class="attach-pill table" *ngIf="attachmentCount(s); else noFiles">
                  <mat-icon>attach_file</mat-icon>{{ attachmentCount(s) }}
                </span>
                <ng-template #noFiles><span class="meta">—</span></ng-template>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Payment</th>
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
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" (click)="toggleExpand(s)">
                    <mat-icon>unfold_more</mat-icon><span>{{ 'sale.details' | t }}</span>
                  </button>
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

            <ng-container matColumnDef="detail">
              <td mat-cell *matCellDef="let row" [attr.colspan]="displayedColumns.length" class="expand-cell">
                <div class="table-expand" *ngIf="isDetailRow(0, row)">
                  <div class="expand-grid">
                    <section class="expand-col">
                      <h4 class="section-label">{{ 'sale.billing' | t }}</h4>
                      <div class="receipt flat compact">
                        <div class="receipt-row" *ngFor="let line of billingLines(row.sale)" [class.deduction]="line.negative" [class.total]="line.total" [class.subdued]="line.subdued">
                          <span class="receipt-label">{{ line.label }}</span>
                          <span class="receipt-value" [class.negative]="line.negative" [class.emphasis]="line.total">
                            <ng-container *ngIf="line.negative">−</ng-container>₹{{ line.amount | number:'1.2-2' }}
                          </span>
                        </div>
                      </div>
                      <div class="expand-meta" *ngIf="hasExpandMeta(row.sale)">
                        <p class="meta-line" *ngIf="row.sale.transporterName"><mat-icon>local_shipping</mat-icon>{{ row.sale.transporterName }}</p>
                        <p class="meta-line" *ngIf="row.sale.transportNumber"><mat-icon>directions_car</mat-icon>{{ row.sale.transportNumber }}</p>
                        <p class="meta-line" *ngIf="row.sale.createdByFullName"><mat-icon>person</mat-icon>{{ row.sale.createdByFullName }}</p>
                        <p class="meta-line notes" *ngIf="row.sale.remarks"><mat-icon>notes</mat-icon>{{ row.sale.remarks }}</p>
                      </div>
                    </section>
                    <section class="expand-col docs">
                      <div class="section-row">
                        <h4 class="section-label">{{ 'sale.documents' | t }}</h4>
                        <span class="section-count" *ngIf="attachmentCount(row.sale)">{{ attachmentCount(row.sale) }}</span>
                      </div>
                      <label class="upload-link" [class.busy]="attachmentBusy">
                        <input
                          type="file"
                          multiple
                          [disabled]="attachmentBusy"
                          accept="image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          (change)="onSaleFilesSelected(row.sale, $event)" />
                        <mat-icon>add</mat-icon>
                        {{ attachmentBusy ? ('sale.uploading' | t) : ('sale.addBillFile' | t) }}
                      </label>
                      <p class="files-empty" *ngIf="!attachmentCount(row.sale)">{{ 'sale.noDocuments' | t }}</p>
                      <div class="attachment-scroll" *ngIf="attachmentCount(row.sale)">
                        <div class="file-row" *ngFor="let att of row.sale.attachments">
                          <div class="file-main">
                            <mat-icon>{{ attachmentIcon(att) }}</mat-icon>
                            <div class="file-copy">
                              <span>{{ att.originalFilename }}</span>
                              <small>{{ formatFileSize(att.sizeBytes) }} · {{ formatAttachmentTime(att) }}<ng-container *ngIf="att.uploadedByFullName"> · {{ att.uploadedByFullName }}</ng-container></small>
                            </div>
                          </div>
                          <div class="file-actions">
                            <button type="button" class="icon-btn xs" *ngIf="isPreviewable(att)" (click)="viewAttachment(row.sale, att)" aria-label="View">
                              <mat-icon>visibility</mat-icon>
                            </button>
                            <button type="button" class="icon-btn xs" (click)="downloadAttachment(row.sale, att)" aria-label="Download">
                              <mat-icon>download</mat-icon>
                            </button>
                            <button type="button" class="icon-btn xs danger" (click)="removeAttachment(row.sale, att)" aria-label="Remove">
                              <mat-icon>delete_outline</mat-icon>
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns; when: isDataRow"
              class="data-row"
              [class.expanded-row]="expandedSaleId === row.id"
              (click)="toggleExpand(row)"></tr>
            <tr mat-row *matRowDef="let row; columns: ['detail']; when: isDetailRow" class="detail-row"></tr>
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
              <div class="form-section-title">{{ 'sale.charges' | t }}</div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'sale.transporter' | t }}</mat-label>
                  <mat-select formControlName="transporterId">
                    <mat-option [value]="null">{{ 'sale.transporterNone' | t }}</mat-option>
                    <mat-option *ngFor="let tr of transporters" [value]="tr.id">{{ tr.name }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'sale.vehicleNumber' | t }}</mat-label>
                  <input matInput formControlName="transportNumber" id="sale-transport" maxlength="50" [placeholder]="'sale.vehiclePlaceholder' | t">
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'sale.transportCharge' | t }}</mat-label>
                  <input matInput type="number" step="0.01" formControlName="transportCharge" inputmode="decimal">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'sale.labourCharge' | t }}</mat-label>
                  <input matInput type="number" step="0.01" formControlName="labourCharge" inputmode="decimal">
                </mat-form-field>
              </div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ 'sale.remarks' | t }}</mat-label>
                  <input matInput formControlName="remarks">
                </mat-form-field>
              </div>
            </div>

            <div class="form-section attachments-form">
              <div class="form-section-title">{{ 'sale.billDocuments' | t }}</div>
              <p class="attachment-hint" *ngIf="!editingSale">{{ 'sale.attachHintNew' | t }}</p>
              <p class="attachment-hint" *ngIf="editingSale">{{ 'sale.attachHintEdit' | t }}</p>
              <div class="files-actions form">
                <label class="upload-zone wide" [class.busy]="attachmentBusy">
                  <input
                    type="file"
                    multiple
                    [disabled]="attachmentBusy"
                    accept="image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                    (change)="onFormFilesSelected($event)" />
                  <span class="upload-zone-ui">
                    <mat-icon>upload_file</mat-icon>
                    {{ attachmentBusy ? ('sale.uploading' | t) : ('sale.selectBillFile' | t) }}
                  </span>
                </label>
                <small class="upload-note">{{ 'sale.attachNote' | t }}</small>
              </div>

              <div class="attachment-scroll form-attach" *ngIf="formAttachments.length || pendingFiles.length">
                <div class="file-row form" *ngFor="let att of formAttachments">
                  <div class="file-main">
                    <mat-icon>{{ attachmentIcon(att) }}</mat-icon>
                    <div class="file-copy">
                      <span>{{ att.originalFilename }}</span>
                      <small>{{ formatFileSize(att.sizeBytes) }} · {{ formatAttachmentTime(att) }}</small>
                    </div>
                  </div>
                  <div class="file-actions" *ngIf="editingSale">
                    <button type="button" class="icon-btn xs" *ngIf="isPreviewable(att)" (click)="viewAttachment(editingSale, att)" aria-label="View">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button type="button" class="icon-btn xs" (click)="downloadAttachment(editingSale, att)" aria-label="Download">
                      <mat-icon>download</mat-icon>
                    </button>
                    <button type="button" class="icon-btn xs danger" (click)="removeAttachment(editingSale, att)" aria-label="Remove">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="file-row form pending" *ngFor="let file of pendingFiles; let i = index">
                  <div class="file-main">
                    <mat-icon>schedule</mat-icon>
                    <div class="file-copy">
                      <span>{{ file.name }}</span>
                      <small>Queued · {{ formatFileSize(file.size) }}</small>
                    </div>
                  </div>
                  <button type="button" class="icon-btn xs danger" (click)="removePendingFile(i)" aria-label="Remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
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

      <!-- Confirm / delete -->
      <div class="dialog-overlay" *ngIf="confirmModal" (click)="closeConfirmModal()">
        <div
          class="dialog-panel card panel-sm confirm-sheet"
          id="sale-confirm-modal"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true">
          <div class="dialog-header">
            <h3 *ngIf="confirmModal.action === 'confirm'">{{ 'sale.confirmTitle' | t }}</h3>
            <h3 *ngIf="confirmModal.action === 'delete'">{{ 'sale.deleteTitle' | t }}</h3>
            <button mat-icon-button type="button" (click)="closeConfirmModal()" [attr.aria-label]="'action.close' | t" [disabled]="confirmBusy">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="dialog-body">
            <p class="confirm-copy" *ngIf="confirmModal.action === 'confirm'">
              {{ 'sale.confirmBody' | t }} <strong>{{ confirmModal.sale.buyerName }}</strong>?
              {{ 'sale.confirmStock' | t }} <strong>{{ confirmModal.sale.quantityQuintals | number:'1.2-2' }} qtl</strong>.
            </p>
            <p class="confirm-copy" *ngIf="confirmModal.action === 'delete'">
              {{ 'sale.deleteBody' | t }} <strong>#{{ confirmModal.sale.id }}</strong>
              {{ 'sale.deleteTo' | t }} <strong>{{ confirmModal.sale.buyerName }}</strong>? {{ 'sale.deleteAttachNote' | t }}
            </p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeConfirmModal()" [disabled]="confirmBusy">
                {{ 'action.cancel' | t }}
              </button>
              <button
                type="button"
                class="btn btn-primary"
                id="sale-confirm-submit"
                *ngIf="confirmModal.action === 'confirm'"
                (click)="executeConfirmAction()"
                [disabled]="confirmBusy">
                {{ confirmBusy ? ('sale.confirming' | t) : ('sale.confirm' | t) }}
              </button>
              <button
                type="button"
                class="btn btn-danger"
                id="sale-delete-submit"
                *ngIf="confirmModal.action === 'delete'"
                (click)="executeConfirmAction()"
                [disabled]="confirmBusy">
                {{ confirmBusy ? ('sale.deleting' | t) : ('sale.deleteDraft' | t) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sale-page {
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
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
    }
    .stat-pill mat-icon { color: var(--color-text-muted); font-size: 20px; width: 20px; height: 20px; }
    .stat-pill strong { display: block; font-family: var(--font-heading); font-size: 1rem; font-weight: 800; line-height: 1.1; }
    .stat-pill span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
    .stat-pill.warn { border-color: color-mix(in srgb, var(--color-warning) 35%, var(--color-border)); }
    .stat-pill.danger { border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border)); }

    .toolbar {
      position: sticky; top: 0; z-index: 5;
      padding: 10px 12px; margin-bottom: 10px;
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      backdrop-filter: blur(10px);
    }
    .toolbar-main { display: flex; align-items: center; gap: 8px; }
    .search-box {
      flex: 1; min-width: 0;
      display: flex; align-items: center; gap: 8px;
      min-height: 44px; padding: 0 12px;
      border: 1px solid var(--color-border); border-radius: 12px;
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
    .toolbar-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .tool-btn {
      position: relative; min-width: 44px; height: 44px;
      border: 1px solid var(--color-border); border-radius: 12px;
      background: var(--color-surface); color: var(--color-text-secondary);
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      cursor: pointer; padding: 0 10px; font: inherit;
    }
    .tool-btn.active {
      border-color: var(--color-primary); color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
    }
    .tool-label { display: none; font-size: 12px; font-weight: 700; }
    .filter-dot {
      position: absolute; top: 8px; right: 8px;
      width: 7px; height: 7px; border-radius: 50%; background: var(--color-primary);
    }

    .filter-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.18s ease; }
    .filter-panel.open { grid-template-rows: 1fr; }
    .filter-panel-inner {
      min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 4px;
      position: relative; padding-right: 68px;
    }
    .filter-panel.open .filter-panel-inner {
      padding-top: 4px; margin-top: 6px; border-top: 1px solid var(--color-border-subtle);
    }
    .clear-filters-btn {
      position: absolute; top: 4px; right: 0;
      border: none; background: transparent; color: var(--color-primary);
      font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
      opacity: 0; pointer-events: none; padding: 4px 0;
    }
    .clear-filters-btn.visible { opacity: 1; pointer-events: auto; }
    .chip-row { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 1px; }
    .chip-row::-webkit-scrollbar { display: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto;
      min-height: 26px; padding: 0 9px; border-radius: 999px;
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-secondary); cursor: pointer; font: inherit;
      font-size: 10px; font-weight: 650; white-space: nowrap;
    }
    .chip em {
      font-style: normal; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px;
      background: var(--color-surface-raised); font-size: 9px;
      display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-muted);
    }
    .chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .chip.active em { background: rgba(255,255,255,0.22); color: #fff; }

    .sale-list { display: flex; flex-direction: column; gap: 8px; }
    .sale-card {
      overflow: hidden;
      border-left: 3px solid transparent;
    }
    .sale-card.draft { border-left-color: var(--color-warning); }
    .sale-card.expanded {
      border-color: color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
    }
    .card-hit {
      width: 100%; border: none; background: transparent; text-align: left;
      cursor: pointer; padding: 10px 12px 8px; font: inherit; color: inherit;
    }
    .compact-top { display: flex; align-items: flex-start; gap: 8px; }
    .compact-main { flex: 1; min-width: 0; }
    .compact-party {
      display: block; font-size: 14px; font-weight: 750; line-height: 1.2;
      color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .compact-meta, .compact-commodity {
      display: block; margin-top: 2px; font-size: 11px; line-height: 1.3;
      color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .compact-commodity { color: var(--color-text-secondary); font-weight: 600; }
    .compact-end {
      flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end;
      gap: 1px; max-width: 38%;
    }
    .compact-amt {
      font-family: var(--font-heading); font-size: 1rem; font-weight: 800;
      line-height: 1.1; color: var(--color-text-primary); font-variant-numeric: tabular-nums;
    }
    .compact-due { font-size: 10px; font-weight: 700; color: var(--color-danger); }
    .compact-chev { margin-top: 2px; font-size: 20px !important; width: 20px !important; height: 20px !important; color: var(--color-text-muted); }
    .compact-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; align-items: center; }
    .compact-badges ::ng-deep .status-badge { min-height: 22px; padding: 1px 7px 1px 6px; font-size: 10px; }
    .type-pill, .attach-pill {
      display: inline-flex; align-items: center; gap: 4px;
      min-height: 22px; padding: 1px 8px; border-radius: 999px;
      background: var(--color-surface-raised); border: 1px solid var(--color-border-subtle);
      font-size: 10px; font-weight: 700; color: var(--color-text-secondary);
    }
    .attach-pill mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .compact-progress { margin-top: 6px; height: 3px; border-radius: 999px; background: var(--color-border-subtle); overflow: hidden; }
    .compact-progress i { display: block; height: 100%; background: var(--color-success); border-radius: inherit; }

    .row-expand {
      width: 100%;
      box-sizing: border-box;
      padding: 4px 12px 14px;
      border-top: 1px solid var(--color-border-subtle);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface-raised) 88%, var(--color-surface)) 0%,
        var(--color-surface) 100%
      );
    }

    .expand-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      width: 100%;
    }
    .expand-col {
      min-width: 0;
      width: 100%;
    }

    .section-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }
    .section-label {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .section-row .section-label { margin-bottom: 0; }
    .section-count {
      font-size: 11px;
      font-weight: 650;
      color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .receipt { display: flex; flex-direction: column; }
    .receipt.flat { gap: 0; }
    .receipt.compact .receipt-row { padding: 3px 0; font-size: 12px; }
    .receipt-row {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 16px; padding: 5px 0; font-size: 13px; color: var(--color-text-secondary);
    }
    .receipt-row.subdued { color: var(--color-text-muted); font-size: 12px; }
    .receipt-row.deduction .receipt-value { color: var(--color-danger); }
    .receipt-row.total {
      margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--color-border-subtle);
      font-weight: 700; color: var(--color-text-primary);
    }
    .receipt-label { flex: 1; min-width: 0; line-height: 1.35; }
    .receipt-value { font-variant-numeric: tabular-nums; font-weight: 650; white-space: nowrap; color: var(--color-text-primary); }
    .receipt-value.negative { color: var(--color-danger); }
    .receipt-value.emphasis { font-size: 14px; color: var(--color-primary-dark); }

    .expand-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--color-border-subtle);
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
      margin: 10px 0 0;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .attachment-scroll { margin-top: 4px; }
    .files-actions.form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .upload-link {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 36px;
      margin-bottom: 4px;
      padding: 0 2px;
      border: none;
      background: transparent;
      color: var(--color-primary);
      font-size: 13px;
      font-weight: 650;
      font-family: inherit;
      cursor: pointer;
      line-height: 1.3;
      overflow: hidden;
    }
    .upload-link.busy { opacity: 0.55; pointer-events: none; }
    .upload-link:hover { color: var(--color-primary-dark); }
    .upload-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .upload-link input[type='file'] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 16px;
    }

    .upload-zone {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 48px;
      border: 1.5px dashed var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      cursor: pointer;
      overflow: hidden;
      box-sizing: border-box;
    }
    .upload-zone.wide { min-height: 52px; }
    .upload-zone.busy { opacity: 0.6; pointer-events: none; }
    .upload-zone:hover { border-color: var(--color-primary); }
    .upload-zone input[type='file'] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
      margin: 0;
      padding: 0;
      border: 0;
      font-size: 16px;
    }
    .upload-zone-ui {
      position: relative;
      z-index: 1;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-primary);
      padding: 0 12px;
    }
    .upload-zone-ui mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .file-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border-subtle);
    }
    .file-row:last-child { border-bottom: none; }
    .file-row.form { padding: 6px 0; }
    .file-row.pending { border-bottom-style: dashed; }
    .file-main { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
    .file-main > mat-icon {
      flex-shrink: 0;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-text-muted);
    }
    .file-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .file-copy span {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-copy small {
      font-size: 11px;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-actions { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .icon-btn.xs {
      width: 30px; height: 30px; padding: 0; border: none; border-radius: 8px;
      background: transparent; color: var(--color-text-muted);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .icon-btn.xs:hover { background: var(--color-surface-raised); color: var(--color-text-primary); }
    .icon-btn.xs.danger:hover { color: var(--color-danger); background: var(--color-danger-bg); }
    .icon-btn.xs mat-icon { font-size: 17px; width: 17px; height: 17px; }

    .card-actions { display: flex; align-items: center; gap: 6px; padding: 0 10px 8px; }
    .compact-actions .btn-sm { min-height: 36px; padding: 0 10px; font-size: 12px; }
    .compact-actions .flex-grow { flex: 1; }
    .icon-btn.sm { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--color-border); background: var(--color-surface); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; color: var(--color-text-secondary); }
    .icon-btn.sm.danger { color: var(--color-danger); }
    .icon-btn.sm mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-block { width: 100%; }
    .settled { display: inline-flex; align-items: center; gap: 6px; color: var(--color-success); font-size: 12px; font-weight: 700; width: 100%; justify-content: center; }

    .table-only { display: none; }
    .sale-table { width: 100%; }
    .data-row { cursor: pointer; }
    .data-row.expanded-row,
    :host ::ng-deep .sale-table .mat-mdc-row.expanded-row {
      background: color-mix(in srgb, var(--color-primary) 4%, transparent) !important;
      border-bottom-color: transparent !important;
    }
    :host ::ng-deep .sale-table .mat-mdc-row.expanded-row .mat-mdc-cell {
      border-bottom: none !important;
    }
    .party-name, .variety-lbl, .amount { font-weight: 650; }
    .meta { font-size: 12px; color: var(--color-text-muted); }
    .sortable { cursor: pointer; user-select: none; white-space: nowrap; }
    .sortable:hover { color: var(--color-primary); }
    .sort-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }
    .expand-cell {
      padding: 0 !important;
      overflow: visible !important;
      background: color-mix(in srgb, var(--color-surface-raised) 75%, var(--color-surface)) !important;
      border-bottom: 1px solid var(--color-border-subtle) !important;
    }
    .detail-row {
      overflow: visible;
      background: color-mix(in srgb, var(--color-surface-raised) 75%, var(--color-surface)) !important;
    }
    .detail-row:hover {
      background: color-mix(in srgb, var(--color-surface-raised) 75%, var(--color-surface)) !important;
    }
    .detail-row .mat-mdc-cell { border-bottom: none !important; }
    .detail-row td { padding: 0 !important; }
    .table-only.table-scroll { overflow-x: auto; overflow-y: visible; }
    .table-expand {
      width: 100%;
      box-sizing: border-box;
      overflow: visible;
      margin: 0;
      padding: 10px 20px 16px 52px;
      border-top: 1px solid var(--color-border-subtle);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-surface-raised) 88%, var(--color-surface)) 0%,
        var(--color-surface) 100%
      );
    }

    .empty-state, .loading-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; padding: 48px 20px; text-align: center; color: var(--color-text-muted);
    }
    .empty-state h2 { margin: 0; font-family: var(--font-heading); font-size: 1.1rem; color: var(--color-text-primary); }
    .empty-state p { margin: 0; max-width: 34ch; font-size: 13px; line-height: 1.45; }
    .empty-state mat-icon, .loading-state mat-icon { font-size: 42px; width: 42px; height: 42px; color: var(--color-border); }

    .fab {
      position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 40;
      width: 56px; height: 56px; border: none; border-radius: 18px;
      background: var(--color-primary); color: #fff;
      box-shadow: 0 8px 24px var(--color-primary-shadow);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }

    .sale-form, .pay-form { display: flex; flex-direction: column; gap: 2px; }
    .type-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .type-option {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; min-height: 84px; padding: 12px 8px; border-radius: 14px;
      border: 1.5px solid var(--color-border); background: var(--color-surface-raised);
      color: var(--color-text-secondary); cursor: pointer; font-family: inherit;
    }
    .type-option.active {
      border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary-dark);
    }
    .estimate {
      display: flex; justify-content: space-between; align-items: center;
      margin: 4px 0 8px; padding: 12px 14px; border-radius: 12px;
      background: var(--color-surface-raised); border: 1px dashed var(--color-border);
    }
    .estimate strong { font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: var(--color-primary-dark); }

    .attachments-form { margin-top: 4px; }
    .attachment-hint { margin: 0 0 8px; font-size: 12px; color: var(--color-text-muted); line-height: 1.4; }
    .upload-btn { width: 100%; justify-content: center; min-height: 40px; }
    .upload-note { display: block; margin-top: 4px; font-size: 11px; color: var(--color-text-muted); text-align: center; }

    .confirm-copy { margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: var(--color-text-secondary); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .stats-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .toolbar { padding: 8px 10px; }
    }
    @media (min-width: 640px) {
      .tool-label { display: inline; }
    }
    @media (min-width: 900px) {
      .sale-page { padding-bottom: 24px; }
      .desktop-add { display: inline-flex; }
      .fab { display: none; }
      .sale-list { display: none; }
      .table-only { display: block; width: 100%; }
      .toolbar { position: static; }
      .filter-panel-inner { padding-right: 76px; }
      .expand-grid {
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
        gap: 0;
        align-items: start;
      }
      .expand-col.docs {
        padding-left: 28px;
        margin-left: 28px;
        border-left: 1px solid var(--color-border-subtle);
      }
      .table-expand { padding: 12px 24px 18px 56px; }
      .attachment-scroll {
        max-height: 240px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 4px;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
      }
      .attachment-scroll.form-attach {
        max-height: 200px;
        margin-top: 8px;
      }
    }
  `]
})
export class SaleListComponent implements OnInit {
  displayedColumns = ['expand', 'date', 'type', 'buyer', 'commodity', 'qty', 'total', 'files', 'status', 'confirmed', 'actions'];
  sales: Sale[] = [];
  filteredSales: Sale[] = [];
  buyers: Party[] = [];
  transporters: Party[] = [];
  commodities: Commodity[] = [];
  varieties: CommodityVariety[] = [];

  loading = false;
  saving = false;
  filterStatus: SaleFilter = '';
  filterSaleType: SaleTypeFilter = '';
  searchText = '';
  sortColumn: SaleSortColumn = 'date';
  sortDirection: SaleSortDirection = 'desc';
  expandedSaleId: number | null = null;
  showFilterPanel = false;

  showForm = false;
  editingSale: Sale | null = null;
  saleForm: FormGroup;
  pendingFiles: File[] = [];
  attachmentBusy = false;

  showReceiptForm = false;
  receiptSale: Sale | null = null;
  receiptForm: FormGroup;

  confirmModal: { action: SaleConfirmAction; sale: Sale } | null = null;
  confirmBusy = false;

  constructor(
    private saleService: SaleService,
    private partyService: PartyService,
    private commodityService: CommodityService,
    private cashbookService: CashbookService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private i18n: I18nService
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
      transportNumber: [''],
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

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterStatus || this.filterSaleType);
  }

  get formAttachments(): SaleAttachment[] {
    return this.editingSale?.attachments ?? [];
  }

  get tableRows(): Array<Sale | { detailRow: true; sale: Sale }> {
    const rows: Array<Sale | { detailRow: true; sale: Sale }> = [];
    for (const sale of this.filteredSales) {
      rows.push(sale);
      if (this.expandedSaleId === sale.id) {
        rows.push({ detailRow: true, sale });
      }
    }
    return rows;
  }

  isDataRow = (_index: number, row: Sale | { detailRow: true; sale: Sale }): row is Sale =>
    !('detailRow' in row);

  isDetailRow = (_index: number, row: Sale | { detailRow: true; sale: Sale }): row is { detailRow: true; sale: Sale } =>
    'detailRow' in row && row.detailRow === true;

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

  countSaleType(type: SaleType): number {
    return this.sales.filter(s => s.saleType === type).length;
  }

  attachmentCount(s: Sale): number {
    return s.attachments?.length ?? 0;
  }

  dueOf(s: Sale): number {
    return Math.max(0, (s.totalAmount || 0) - (s.amountReceived || 0));
  }

  receivedPct(s: Sale): number {
    if (!s.totalAmount) return 0;
    return Math.min(100, Math.round((s.amountReceived / s.totalAmount) * 100));
  }

  toggleExpand(s: Sale, event?: Event) {
    event?.stopPropagation();
    this.expandedSaleId = this.expandedSaleId === s.id ? null : s.id;
  }

  toggleFilters() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  clearAllFilters() {
    this.searchText = '';
    this.filterStatus = '';
    this.filterSaleType = '';
    this.applyFilters();
  }

  billingLines(s: Sale): Array<{ label: string; amount: number; negative?: boolean; total?: boolean; subdued?: boolean }> {
    this.i18n.locale();
    const lines: Array<{ label: string; amount: number; negative?: boolean; total?: boolean; subdued?: boolean }> = [];
    const base = (s.ratePerQuintal || 0) * s.quantityQuintals;

    if (s.saleType === 'RATE_BASED' && s.ratePerQuintal) {
      const label = this.i18n.t('sale.billing.base')
        .replace('{qty}', String(s.quantityQuintals))
        .replace('{rate}', String(s.ratePerQuintal));
      lines.push({ label, amount: base, subdued: true });
    } else if (s.fobDetails) {
      lines.push({ label: this.i18n.t('sale.billing.fob'), amount: base || s.totalAmount, subdued: true });
    }

    if (s.commissionAmount > 0) {
      lines.push({ label: this.i18n.t('sale.billing.commission'), amount: s.commissionAmount });
    }
    if (s.taxAmount > 0) {
      lines.push({ label: this.i18n.t('sale.billing.tax'), amount: s.taxAmount });
    }
    if (s.labourCharge > 0) {
      lines.push({ label: this.i18n.t('sale.billing.labour'), amount: s.labourCharge });
    }
    if (s.transportCharge > 0) {
      lines.push({ label: this.i18n.t('sale.billing.transport'), amount: s.transportCharge });
    }

    lines.push({ label: this.i18n.t('sale.billing.total'), amount: s.totalAmount, total: true });

    if (s.confirmed) {
      lines.push({ label: this.i18n.t('sale.billing.received'), amount: s.amountReceived, subdued: true });
      const due = this.dueOf(s);
      if (due > 0) {
        lines.push({ label: this.i18n.t('sale.billing.balanceDue'), amount: due, negative: true });
      }
    }
    return lines;
  }

  hasExpandMeta(s: Sale): boolean {
    return !!(s.transporterName || s.transportNumber || s.remarks || s.createdByFullName);
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
    this.searchText = (event.target as HTMLInputElement).value || '';
    this.applyFilters();
  }

  clearSearch() {
    this.searchText = '';
    this.applyFilters();
  }

  setFilterStatus(status: SaleFilter) {
    this.filterStatus = status;
    this.applyFilters();
    this.showFilterPanel = false;
  }

  setFilterSaleType(type: SaleTypeFilter) {
    this.filterSaleType = type;
    this.applyFilters();
    this.showFilterPanel = false;
  }

  setSortColumn(column: SaleSortColumn) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
    }
    this.applyFilters();
  }

  applyFilters() {
    const q = this.searchText.trim().toLowerCase();
    let results = this.sales.filter(s => {
      let statusOk = true;
      if (this.filterStatus === 'DRAFT') statusOk = !s.confirmed;
      else if (this.filterStatus) statusOk = s.confirmed && s.paymentStatus === this.filterStatus;

      const typeOk = !this.filterSaleType || s.saleType === this.filterSaleType;

      const searchOk = !q
        || s.buyerName.toLowerCase().includes(q)
        || s.commodityName.toLowerCase().includes(q)
        || s.commodityVarietyName.toLowerCase().includes(q)
        || (s.transporterName || '').toLowerCase().includes(q)
        || (s.transportNumber || '').toLowerCase().includes(q)
        || String(s.id).includes(q);
      return statusOk && typeOk && searchOk;
    });

    results = [...results].sort((a, b) => this.compareSales(a, b));
    this.filteredSales = results;

    if (this.expandedSaleId != null && !results.some(s => s.id === this.expandedSaleId)) {
      this.expandedSaleId = null;
    }

    if (this.editingSale) {
      const refreshed = this.sales.find(s => s.id === this.editingSale!.id);
      if (refreshed) {
        this.editingSale = refreshed;
      }
    }
  }

  private compareSales(a: Sale, b: Sale): number {
    let cmp = 0;
    switch (this.sortColumn) {
      case 'buyer':
        cmp = a.buyerName.localeCompare(b.buyerName);
        break;
      case 'amount':
        cmp = (a.totalAmount || 0) - (b.totalAmount || 0);
        break;
      case 'qty':
        cmp = (a.quantityQuintals || 0) - (b.quantityQuintals || 0);
        break;
      case 'type':
        cmp = a.saleType.localeCompare(b.saleType);
        break;
      case 'date':
      default:
        cmp = (a.saleDate || '').localeCompare(b.saleDate || '');
        break;
    }
    if (cmp === 0) cmp = b.id - a.id;
    return this.sortDirection === 'asc' ? cmp : -cmp;
  }

  setSaleType(type: 'RATE_BASED' | 'FOB') {
    this.saleForm.patchValue({ saleType: type });
    this.onSaleTypeChange();
  }

  openForm() {
    this.editingSale = null;
    this.pendingFiles = [];
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
      transportNumber: '',
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
    this.pendingFiles = [];
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
      transportNumber: sale.transportNumber || '',
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
    this.pendingFiles = [];
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

  private buildSaleRequest(): SaleRequest {
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
      transportNumber: (v.transportNumber || '').trim() || undefined,
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
      next: res => {
        const saved = res.data!;
        const finish = () => {
          this.saving = false;
          this.editingSale = saved;
          this.snackBar.open(
            isEdit ? 'Draft updated' : 'Draft saved — add bill documents below',
            'Close',
            { duration: 3000 }
          );
          this.loadSales();
        };

        if (!isEdit && this.pendingFiles.length) {
          this.uploadFiles(saved.id, [...this.pendingFiles]).then(() => {
            this.pendingFiles = [];
            this.saleService.getById(saved.id).subscribe({
              next: detail => {
                this.editingSale = detail.data ?? saved;
                finish();
              },
              error: () => finish()
            });
          });
        } else {
          finish();
        }
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err?.error?.message || 'Could not save sale', 'Close', { duration: 4000 });
      }
    });
  }

  onSaleFilesSelected(sale: Sale, event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.attachmentBusy) return;
    this.uploadFiles(sale.id, files);
  }

  onFormFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.attachmentBusy) return;
    if (!this.editingSale) {
      this.pendingFiles.push(...files);
      this.snackBar.open(`${files.length} file(s) queued — will upload on save`, 'Close', { duration: 2500 });
      return;
    }
    this.uploadFiles(this.editingSale.id, files);
  }

  removePendingFile(index: number) {
    this.pendingFiles.splice(index, 1);
  }

  private uploadFiles(saleId: number, files: File[]): Promise<void> {
    this.attachmentBusy = true;
    return files.reduce((chain, file) => chain.then(() => new Promise<void>((resolve, reject) => {
      this.saleService.uploadAttachment(saleId, file).subscribe({
        next: () => resolve(),
        error: err => reject(err)
      });
    })), Promise.resolve())
      .then(() => {
        this.attachmentBusy = false;
        this.loadSales();
        this.snackBar.open('Attachment(s) uploaded', 'Close', { duration: 2500 });
      })
      .catch(err => {
        this.attachmentBusy = false;
        const message = this.extractErrorMessage(err) || 'Upload failed';
        this.snackBar.open(message, 'Close', { duration: 4000 });
      });
  }

  private extractErrorMessage(err: unknown): string | null {
    const body = (err as { error?: unknown })?.error;
    if (!body) return null;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as { message?: string };
        return parsed.message ?? body;
      } catch {
        return body;
      }
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      return String((body as { message?: string }).message);
    }
    return null;
  }

  viewAttachment(sale: Sale, att: SaleAttachment) {
    this.saleService.downloadAttachment(sale.id, att.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open('Could not open file', 'Close', { duration: 3000 })
    });
  }

  downloadAttachment(sale: Sale, att: SaleAttachment) {
    this.saleService.downloadAttachment(sale.id, att.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = att.originalFilename;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Download failed', 'Close', { duration: 3000 })
    });
  }

  removeAttachment(sale: Sale, att: SaleAttachment) {
    this.saleService.deleteAttachment(sale.id, att.id).subscribe({
      next: () => {
        this.snackBar.open('Attachment removed', 'Close', { duration: 2000 });
        this.loadSales();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Could not remove file', 'Close', { duration: 3500 })
    });
  }

  isPreviewable(att: SaleAttachment): boolean {
    const type = att.contentType || '';
    return type.startsWith('image/') || type === 'application/pdf';
  }

  attachmentIcon(att: SaleAttachment): string {
    const type = att.contentType || '';
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'picture_as_pdf';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatAttachmentTime(att: SaleAttachment): string {
    if (!att.createdAt) return '';
    const raw = att.createdAt as string | number[];
    let date: Date;
    if (Array.isArray(raw)) {
      date = new Date(raw[0], (raw[1] ?? 1) - 1, raw[2] ?? 1, raw[3] ?? 0, raw[4] ?? 0);
    } else {
      date = new Date(raw);
    }
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  confirmSale(sale: Sale) {
    this.confirmModal = { action: 'confirm', sale };
  }

  deleteSale(sale: Sale) {
    this.confirmModal = { action: 'delete', sale };
  }

  closeConfirmModal() {
    if (this.confirmBusy) return;
    this.confirmModal = null;
  }

  executeConfirmAction() {
    if (!this.confirmModal) return;
    this.confirmBusy = true;
    const { action, sale } = this.confirmModal;
    const onSuccess = () => {
      this.confirmBusy = false;
      this.confirmModal = null;
      this.snackBar.open(
        action === 'confirm' ? 'Sale confirmed — stock reduced' : 'Draft deleted',
        'Close',
        { duration: 2500 }
      );
      this.loadSales();
    };
    const onError = (err: { error?: { message?: string } }) => {
      this.confirmBusy = false;
      this.snackBar.open(err?.error?.message || 'Action failed', 'Close', { duration: 4000 });
    };

    if (action === 'confirm') {
      this.saleService.confirm(sale.id).subscribe({ next: onSuccess, error: onError });
    } else {
      this.saleService.delete(sale.id).subscribe({ next: onSuccess, error: onError });
    }
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
