import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CashbookService } from '../../core/services/cashbook.service';
import { PartyService } from '../../core/services/party.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { CashBookDay, CashBookEntry, Party, Purchase, PageResult } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type EntryFilter = '' | 'PAYMENT' | 'RECEIPT';
type ViewMode = 'day' | 'all';

@Component({
  selector: 'app-cashbook',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatSnackBarModule,
    StatusBadgeComponent, TranslatePipe
  ],
  template: `
    <div class="cashbook-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'cashbook.title' | t }}</h1>
          <p class="page-subtitle">{{ 'cashbook.subtitle' | t }}</p>
        </div>
        <div class="header-actions desktop-actions">
          <button
            class="btn btn-ghost"
            type="button"
            (click)="openOpeningForm()"
            *ngIf="viewMode === 'day' && day && !day.finalized && day.entries.length === 0"
            id="btn-opening">
            <mat-icon>account_balance</mat-icon> {{ 'cashbook.setOpening' | t }}
          </button>
          <button class="btn btn-ghost" type="button" (click)="openEntryForm('PAYMENT')" id="btn-payment" [disabled]="viewMode === 'day' && day?.finalized">
            <mat-icon>call_made</mat-icon> {{ 'status.PAYMENT' | t }}
          </button>
          <button class="btn btn-primary" type="button" (click)="openEntryForm('RECEIPT')" id="btn-receipt" [disabled]="viewMode === 'day' && day?.finalized">
            <mat-icon>call_received</mat-icon> {{ 'status.RECEIPT' | t }}
          </button>
        </div>
      </header>

      <!-- View mode toggle -->
      <section class="view-toggle card">
        <button 
          type="button" 
          class="toggle-btn" 
          [class.active]="viewMode === 'day'" 
          (click)="setViewMode('day')">
          <mat-icon>today</mat-icon>
          Day View
        </button>
        <button 
          type="button" 
          class="toggle-btn" 
          [class.active]="viewMode === 'all'" 
          (click)="setViewMode('all')">
          <mat-icon>view_list</mat-icon>
          All Entries
        </button>
      </section>

      <!-- Day view content -->
      <ng-container *ngIf="viewMode === 'day'">
        <!-- Date navigator -->
        <section class="day-nav card">
          <button type="button" class="nav-btn" (click)="shiftDay(-1)" aria-label="Previous day">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <div class="day-center">
            <input
              type="date"
              class="date-input"
              [value]="selectedDate"
              (change)="onDateChange($event)"
              id="cashbook-date" />
            <button type="button" class="today-chip" *ngIf="!isToday" (click)="goToday()">Today</button>
          </div>
          <button type="button" class="nav-btn" (click)="shiftDay(1)" aria-label="Next day" [disabled]="isToday">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </section>

      <div *ngIf="loading && !day" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading cash book…</span>
      </div>

      <ng-container *ngIf="day as d">
        <!-- Hero closing -->
        <section class="hero card" [class.finalized]="d.finalized">
          <div class="hero-top">
            <div>
              <div class="hero-label">{{ 'cashbook.closing' | t }}</div>
              <div class="hero-amount">₹{{ d.closingBalance | number:'1.2-2' }}</div>
            </div>
            <div class="hero-right">
              <app-status-badge [kind]="d.finalized ? 'FINALIZED' : 'OPEN'"></app-status-badge>
              <button type="button" class="icon-refresh" (click)="loadDay()" [disabled]="loading" aria-label="Refresh">
                <mat-icon [class.spin]="loading">refresh</mat-icon>
              </button>
            </div>
          </div>
          <div class="hero-meta">
            <div>
              <span>{{ 'cashbook.opening' | t }}</span>
              <strong>₹{{ d.openingBalance | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>{{ 'cashbook.receipts' | t }}</span>
              <strong class="text-success">+₹{{ d.totalReceipts | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>{{ 'cashbook.payments' | t }}</span>
              <strong class="text-danger">−₹{{ d.totalPayments | number:'1.0-0' }}</strong>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-opening"
            *ngIf="!d.finalized && d.entries.length === 0"
            (click)="openOpeningForm()">
            <mat-icon>account_balance</mat-icon>
            {{ 'cashbook.setOpening' | t }}
          </button>
        </section>

        <!-- Entry filter -->
        <div class="filter-row" *ngIf="d.entries.length">
          <button type="button" class="chip" [class.active]="entryFilter === ''" (click)="entryFilter = ''">
            All <em>{{ d.entries.length }}</em>
          </button>
          <button type="button" class="chip" [class.active]="entryFilter === 'RECEIPT'" (click)="entryFilter = 'RECEIPT'">
            In <em>{{ receiptCount }}</em>
          </button>
          <button type="button" class="chip" [class.active]="entryFilter === 'PAYMENT'" (click)="entryFilter = 'PAYMENT'">
            Out <em>{{ paymentCount }}</em>
          </button>
        </div>

        <div *ngIf="loading" class="loading-state card compact">
          <mat-icon class="spin">autorenew</mat-icon>
          <span>Refreshing…</span>
        </div>

        <ng-container *ngIf="!loading">
          <!-- Mobile entries -->
          <div class="mobile-list" *ngIf="filteredEntries.length; else emptyEntries">
            <article class="entry-card card" *ngFor="let e of filteredEntries" [attr.data-type]="e.type">
              <div class="row-top">
                <app-status-badge [kind]="e.type"></app-status-badge>
                <strong [class.text-success]="e.type === 'RECEIPT'" [class.text-danger]="e.type === 'PAYMENT'">
                  {{ e.type === 'PAYMENT' ? '−' : '+' }}₹{{ e.amount | number:'1.2-2' }}
                </strong>
              </div>
              <div class="row-title">{{ e.partyName || 'Cash entry' }}</div>
              <div class="row-meta">
                <span *ngIf="e.linkedPurchaseId">Purchase #{{ e.linkedPurchaseId }} · </span>
                <span *ngIf="e.linkedSaleId">Sale #{{ e.linkedSaleId }} · </span>
                bal ₹{{ e.runningBalance | number:'1.0-0' }}
                <span *ngIf="e.createdByFullName"> · {{ e.createdByFullName }}</span>
              </div>
              <p class="remarks" *ngIf="e.remarks">{{ e.remarks }}</p>
            </article>
          </div>

          <ng-template #emptyEntries>
            <div class="empty-state card">
              <mat-icon>account_balance_wallet</mat-icon>
              <h2>{{ entryFilter ? 'No matching entries' : 'No cash entries' }}</h2>
              <p *ngIf="!entryFilter && !d.finalized">Record a payment or receipt to begin this day.</p>
              <p *ngIf="entryFilter">Try another filter.</p>
            </div>
          </ng-template>

          <!-- Desktop table -->
          <div class="card table-only table-scroll" *ngIf="filteredEntries.length">
            <table mat-table [dataSource]="filteredEntries" class="cashbook-table">
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
            </table>
          </div>

          <div class="finalize-bar" *ngIf="!d.finalized && d.entries.length > 0">
            <button class="btn btn-ghost" type="button" (click)="finalizeDay()" id="btn-finalize">
              <mat-icon>lock</mat-icon> Finalize Day
            </button>
          </div>
        </ng-container>
      </ng-container>
      </ng-container>

      <!-- All Entries View -->
      <ng-container *ngIf="viewMode === 'all'">
        <section class="filters card">
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>From Date</mat-label>
            <input matInput type="date" [(ngModel)]="fromDate" (change)="loadAllEntries()">
          </mat-form-field>
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>To Date</mat-label>
            <input matInput type="date" [(ngModel)]="toDate" (change)="loadAllEntries()">
          </mat-form-field>
          <button type="button" class="btn btn-ghost" (click)="clearFilters()">
            <mat-icon>clear</mat-icon>
            Clear Filters
          </button>
        </section>

        <div *ngIf="loading && !allEntries" class="loading-state card">
          <mat-icon class="spin">autorenew</mat-icon>
          <span>Loading entries…</span>
        </div>

        <ng-container *ngIf="allEntries">
          <div *ngIf="loading" class="loading-state card compact">
            <mat-icon class="spin">autorenew</mat-icon>
            <span>Refreshing…</span>
          </div>

          <ng-container *ngIf="!loading">
            <!-- Mobile entries -->
            <div class="mobile-list" *ngIf="allEntries.content.length; else emptyAllEntries">
              <article class="entry-card card" *ngFor="let e of allEntries.content" [attr.data-type]="e.type">
                <div class="row-top">
                  <app-status-badge [kind]="e.type"></app-status-badge>
                  <strong [class.text-success]="e.type === 'RECEIPT'" [class.text-danger]="e.type === 'PAYMENT'">
                    {{ e.type === 'PAYMENT' ? '−' : '+' }}₹{{ e.amount | number:'1.2-2' }}
                  </strong>
                </div>
                <div class="row-title">{{ e.partyName || 'Cash entry' }}</div>
                <div class="row-meta">
                  {{ e.entryDate | date:'dd MMM yyyy' }} ·
                  <span *ngIf="e.linkedPurchaseId">Purchase #{{ e.linkedPurchaseId }} · </span>
                  <span *ngIf="e.linkedSaleId">Sale #{{ e.linkedSaleId }} · </span>
                  bal ₹{{ e.runningBalance | number:'1.0-0' }}
                  <span *ngIf="e.createdByFullName"> · {{ e.createdByFullName }}</span>
                </div>
                <p class="remarks" *ngIf="e.remarks">{{ e.remarks }}</p>
              </article>
            </div>

            <ng-template #emptyAllEntries>
              <div class="empty-state card">
                <mat-icon>account_balance_wallet</mat-icon>
                <h2>No cash entries found</h2>
                <p>No entries match the selected criteria.</p>
              </div>
            </ng-template>

            <!-- Desktop table -->
            <div class="card table-only table-scroll" *ngIf="allEntries.content.length">
              <table mat-table [dataSource]="allEntries.content" class="cashbook-table">
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let e">{{ e.entryDate | date:'dd MMM yyyy' }}</td>
                </ng-container>
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
                <tr mat-header-row *matHeaderRowDef="displayedColumnsAll"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumnsAll;"></tr>
              </table>
            </div>

            <!-- Pagination -->
            <mat-paginator
              *ngIf="allEntries.totalElements > 0"
              class="card paginator"
              [length]="allEntries.totalElements"
              [pageIndex]="allEntriesPageIndex"
              [pageSize]="allEntriesPageSize"
              [pageSizeOptions]="pageSizeOptions"
              [showFirstLastButtons]="true"
              (page)="onAllEntriesPage($event)">
            </mat-paginator>
          </ng-container>
        </ng-container>
      </ng-container>

      <!-- Mobile sticky actions -->
      <div class="mobile-actions" *ngIf="viewMode === 'day' && day && !day.finalized">
        <button type="button" class="btn btn-ghost" (click)="openEntryForm('PAYMENT')" id="btn-payment-mobile">
          <mat-icon>call_made</mat-icon>
          {{ 'status.PAYMENT' | t }}
        </button>
        <button type="button" class="btn btn-primary" (click)="openEntryForm('RECEIPT')" id="btn-receipt-mobile">
          <mat-icon>call_received</mat-icon>
          {{ 'status.RECEIPT' | t }}
        </button>
      </div>

      <!-- Entry form -->
      <div class="dialog-overlay" *ngIf="showEntryForm" (click)="closeEntryForm()">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ entryFormType === 'PAYMENT' ? 'Record Payment' : 'Record Receipt' }}</h3>
            <button mat-icon-button type="button" (click)="closeEntryForm()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <p class="dialog-context">
            {{ entryFormType === 'PAYMENT' ? 'Cash going out' : 'Cash coming in' }} · {{ selectedDate }}
          </p>
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
              <input matInput type="number" formControlName="amount" id="entry-amount" step="0.01" min="0.01" inputmode="decimal">
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Remarks</mat-label>
              <textarea matInput formControlName="remarks" id="entry-remarks" rows="2"></textarea>
            </mat-form-field>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeEntryForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="entry-save" [disabled]="entryForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving…' : 'Post Entry' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Opening balance -->
      <div class="dialog-overlay" *ngIf="showOpeningForm" (click)="showOpeningForm = false">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>Set Opening Balance</h3>
            <button mat-icon-button type="button" (click)="showOpeningForm = false" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <p class="dialog-context">For {{ selectedDate }}</p>
          <form [formGroup]="openingForm" (ngSubmit)="saveOpening()" class="entry-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Opening Balance (₹)</mat-label>
              <input matInput type="number" formControlName="openingBalance" id="opening-balance" step="0.01" inputmode="decimal">
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
    .cashbook-page {
      max-width: 1100px;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }

    .desktop-actions { display: none; }

    .view-toggle {
      display: flex;
      gap: 8px;
      padding: 8px;
      margin-bottom: 12px;
    }
    .toggle-btn {
      flex: 1;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .toggle-btn mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .toggle-btn.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }
    .toggle-btn:not(.active):hover {
      background: var(--color-surface-raised);
      border-color: var(--color-primary-soft);
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 16px;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .filters .date-field {
      flex: 1;
      min-width: 140px;
    }
    .filters .btn {
      margin-top: 8px;
    }

    .paginator {
      margin-top: 12px;
    }

    .day-nav {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }
    .nav-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
    .nav-btn:disabled { opacity: 0.4; cursor: default; }
    .day-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .date-input {
      width: 100%;
      max-width: 200px;
      min-height: 42px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      color: var(--color-text-primary);
      padding: 8px 12px;
      font: inherit;
      font-size: 16px;
      text-align: center;
    }
    .today-chip {
      border: none;
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
    }

    .hero {
      padding: 16px;
      margin-bottom: 14px;
      background: linear-gradient(145deg, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)), var(--color-surface));
      border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-border));
    }
    .hero.finalized {
      background: linear-gradient(145deg, color-mix(in srgb, var(--color-success) 10%, var(--color-surface)), var(--color-surface));
      border-color: color-mix(in srgb, var(--color-success) 28%, var(--color-border));
    }
    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 14px;
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
      font-size: clamp(1.7rem, 7vw, 2.2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--color-text-primary);
      line-height: 1.1;
      margin-top: 4px;
    }
    .hero-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
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
      padding: 0;
    }
    .icon-refresh:disabled { opacity: 0.55; }

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
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
    }
    .hero-meta strong {
      font-size: 13px;
      font-weight: 750;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-opening {
      width: 100%;
      margin-top: 12px;
    }

    .filter-row {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      margin-bottom: 12px;
    }
    .filter-row::-webkit-scrollbar { display: none; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font: inherit;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
    }
    .chip em {
      font-style: normal;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--color-surface-raised);
      font-size: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .chip.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }
    .chip.active em {
      background: rgba(255,255,255,0.22);
      color: #fff;
    }

    .mobile-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .entry-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-left: 3px solid transparent;
    }
    .entry-card[data-type="RECEIPT"] { border-left-color: var(--color-success); }
    .entry-card[data-type="PAYMENT"] { border-left-color: var(--color-danger); }
    .row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .row-title {
      font-size: 15px;
      font-weight: 750;
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
      line-height: 1.4;
    }

    .text-success { color: var(--color-success); font-weight: 700; }
    .text-danger { color: var(--color-danger); font-weight: 700; }
    .balance-cell { font-weight: 650; }
    .table-only { display: none; }
    .cashbook-table { width: 100%; }

    .finalize-bar {
      margin-top: 14px;
      display: flex;
      justify-content: stretch;
    }
    .finalize-bar .btn { width: 100%; }

    .empty-state, .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 40px 20px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .empty-state h2 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: 1.05rem;
      color: var(--color-text-primary);
    }
    .empty-state p { margin: 0; max-width: 32ch; font-size: 13px; line-height: 1.45; }
    .empty-state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--color-border);
    }
    .loading-state.compact { padding: 24px; }

    .mobile-actions {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
      background: color-mix(in srgb, var(--color-surface) 88%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid var(--color-border-subtle);
      box-shadow: 0 -8px 24px rgba(26, 35, 50, 0.08);
    }
    .mobile-actions .btn { width: 100%; min-height: 46px; }

    .entry-form { display: flex; flex-direction: column; gap: 2px; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 900px) {
      .cashbook-page { padding-bottom: 24px; }
      .desktop-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .mobile-actions { display: none; }
      .mobile-list { display: none; }
      .table-only { display: block; }
      .finalize-bar { justify-content: flex-end; }
      .finalize-bar .btn { width: auto; }
      .btn-opening { width: auto; align-self: flex-start; }
      .hero { display: flex; flex-direction: column; }
    }

    @media (max-width: 420px) {
      .hero-meta { grid-template-columns: 1fr 1fr; }
      .hero-meta div:last-child { grid-column: 1 / -1; }
    }
  `]
})
export class CashbookComponent implements OnInit {
  viewMode: ViewMode = 'day';
  day: CashBookDay | null = null;
  allEntries: PageResult<CashBookEntry> | null = null;
  loading = false;
  saving = false;
  selectedDate = new Date().toISOString().slice(0, 10);
  displayedColumns = ['type', 'party', 'linked', 'amount', 'balance', 'remarks', 'by'];
  displayedColumnsAll = ['date', 'type', 'party', 'linked', 'amount', 'balance', 'remarks', 'by'];
  entryFilter: EntryFilter = '';

  allEntriesPageIndex = 0;
  allEntriesPageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  fromDate: string | null = null;
  toDate: string | null = null;

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

  get isToday(): boolean {
    return this.selectedDate === new Date().toISOString().slice(0, 10);
  }

  get receiptCount(): number {
    return (this.day?.entries || []).filter(e => e.type === 'RECEIPT').length;
  }

  get paymentCount(): number {
    return (this.day?.entries || []).filter(e => e.type === 'PAYMENT').length;
  }

  get filteredEntries(): CashBookEntry[] {
    const entries = this.day?.entries || [];
    if (!this.entryFilter) return entries;
    return entries.filter(e => e.type === this.entryFilter);
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
    this.entryFilter = '';
    this.loadDay();
  }

  shiftDay(delta: number) {
    const d = new Date(this.selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (delta > 0 && next > today) return;
    this.selectedDate = next;
    this.entryFilter = '';
    this.loadDay();
  }

  goToday() {
    this.selectedDate = new Date().toISOString().slice(0, 10);
    this.entryFilter = '';
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

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    if (mode === 'all' && !this.allEntries) {
      this.loadAllEntries();
    }
  }

  loadAllEntries() {
    this.loading = true;
    this.cashbookService.getAllEntries(
      this.allEntriesPageIndex,
      this.allEntriesPageSize,
      this.fromDate || undefined,
      this.toDate || undefined
    ).subscribe({
      next: res => {
        this.allEntries = res.data;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'Failed to load entries', 'OK', { duration: 4000 });
      }
    });
  }

  onAllEntriesPage(event: PageEvent) {
    this.allEntriesPageIndex = event.pageIndex;
    this.allEntriesPageSize = event.pageSize;
    this.loadAllEntries();
  }

  clearFilters() {
    this.fromDate = null;
    this.toDate = null;
    this.allEntriesPageIndex = 0;
    this.loadAllEntries();
  }
}
