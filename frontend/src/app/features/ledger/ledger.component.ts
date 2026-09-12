import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LedgerService } from '../../core/services/ledger.service';
import { PartyService } from '../../core/services/party.service';
import { CashbookService } from '../../core/services/cashbook.service';
import { PurchaseService } from '../../core/services/purchase.service';
import { Party, PartyLedgerSummary, Purchase } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule,
    MatPaginatorModule, MatSnackBarModule,
    StatusBadgeComponent, TranslatePipe, PageHeaderComponent
  ],
  template: `
    <div class="ledger-page" [class.has-party]="!!selectedPartyId">
      <app-page-header [title]="'ledger.title' | t" [subtitle]="'ledger.subtitle' | t"></app-page-header>

      <section class="toolbar card">
        <mat-form-field appearance="outline" class="party-field">
          <mat-label>{{ 'ledger.selectParty' | t }}</mat-label>
          <input
            matInput
            type="text"
            id="ledger-party"
            [formControl]="partyCtrl"
            [matAutocomplete]="partyAuto"
            [placeholder]="'ledger.partyPlaceholder' | t"
            autocomplete="off" />
          <mat-icon matSuffix>arrow_drop_down</mat-icon>
          <mat-autocomplete
            #partyAuto="matAutocomplete"
            [displayWith]="displayParty"
            (optionSelected)="onPartySelected($event.option.value)">
            <mat-option *ngFor="let p of filteredParties" [value]="p">
              {{ p.name }} · {{ p.type }}
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>

        <div class="toolbar-actions">
          <button
            type="button"
            class="icon-refresh"
            (click)="loadLedger()"
            [disabled]="!selectedPartyId || loading"
            [attr.aria-label]="'ledger.refresh' | t">
            <mat-icon [class.spin]="loading">refresh</mat-icon>
          </button>
          <button
            class="btn btn-primary desktop-pay"
            type="button"
            (click)="openPayForm()"
            id="btn-ledger-pay"
            [disabled]="!selectedPartyId">
            <mat-icon>payments</mat-icon> {{ 'ledger.recordPayment' | t }}
          </button>
        </div>
      </section>

      <div *ngIf="!selectedPartyId" class="empty-state card">
        <mat-icon>menu_book</mat-icon>
        <h2>{{ 'ledger.selectParty' | t }}</h2>
        <p>{{ 'ledger.emptyHint' | t }}</p>
      </div>

      <div *ngIf="selectedPartyId && loading && !summary" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>{{ 'ledger.loading' | t }}</span>
      </div>

      <ng-container *ngIf="summary as s">
        <section class="balance-strip card" [class.owe]="s.totalOutstanding > 0" [class.clear]="s.totalOutstanding === 0" [class.credit]="s.totalOutstanding < 0">
          <div class="balance-main">
            <div class="balance-party">
              <span class="party-type">{{ s.partyType }}</span>
              <strong>{{ s.partyName }}</strong>
            </div>
            <div class="balance-amount-wrap">
              <span class="balance-label">{{ 'ledger.outstanding' | t }}</span>
              <div class="balance-amount">₹{{ s.totalOutstanding | number:'1.2-2' }}</div>
              <p class="balance-hint">
                <ng-container *ngIf="s.totalOutstanding > 0">{{ 'ledger.oweThem' | t }}</ng-container>
                <ng-container *ngIf="s.totalOutstanding < 0">{{ 'ledger.theyOwe' | t }}</ng-container>
                <ng-container *ngIf="s.totalOutstanding === 0">{{ 'ledger.settled' | t }}</ng-container>
              </p>
            </div>
          </div>
          <div class="balance-metrics">
            <div>
              <span>{{ 'ledger.opening' | t }}</span>
              <strong>₹{{ s.openingBalance | number:'1.0-0' }}</strong>
            </div>
            <div>
              <span>{{ 'ledger.purchases' | t }}</span>
              <strong>₹{{ purchaseTotal | number:'1.0-0' }}</strong>
            </div>
          </div>
        </section>

        <div class="workspace">
          <section class="panel purchases-panel">
            <div class="block-head">
              <h3>{{ 'ledger.purchases' | t }}</h3>
              <span class="count">{{ partyPurchases.length }}</span>
            </div>

            <div class="panel-scroll" *ngIf="partyPurchases.length; else emptyPurchases">
              <div class="mobile-list">
                <article class="mobile-item" *ngFor="let p of partyPurchases">
                  <div class="row-top">
                    <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                    <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
                    <strong class="tabular-nums">₹{{ p.netPayable | number:'1.0-0' }}</strong>
                  </div>
                  <div class="row-title">{{ p.commodityVarietyName }}</div>
                  <div class="row-meta">
                    {{ p.purchaseDate | date:'dd MMM yyyy' }}
                    · {{ p.weightQuintals | number:'1.1-1' }} qtl
                    · {{ p.bags }} bags
                  </div>
                </article>
              </div>
              <div class="table-wrap table-only">
                <table mat-table [dataSource]="partyPurchases" class="full-table">
                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>{{ 'purchase.sort.date' | t }}</th>
                    <td mat-cell *matCellDef="let p">{{ p.purchaseDate | date:'dd MMM yyyy' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="item">
                    <th mat-header-cell *matHeaderCellDef>{{ 'ledger.item' | t }}</th>
                    <td mat-cell *matCellDef="let p">
                      <div class="cell-strong">{{ p.commodityVarietyName }}</div>
                      <div class="cell-meta">#{{ p.id }} · {{ p.commodityName }}</div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="qty">
                    <th mat-header-cell *matHeaderCellDef>{{ 'ledger.qty' | t }}</th>
                    <td mat-cell *matCellDef="let p">
                      <div class="cell-strong">{{ p.weightQuintals | number:'1.3-3' }} qtl</div>
                      <div class="cell-meta">{{ p.bags }} bags</div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="net">
                    <th mat-header-cell *matHeaderCellDef>{{ 'ledger.amountCol' | t }}</th>
                    <td mat-cell *matCellDef="let p" class="cell-strong tabular-nums">₹{{ p.netPayable | number:'1.2-2' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="stock">
                    <th mat-header-cell *matHeaderCellDef>{{ 'ledger.stock' | t }}</th>
                    <td mat-cell *matCellDef="let p">
                      <app-status-badge *ngIf="p.confirmed" kind="STOCK_IN" icon="check_circle"></app-status-badge>
                      <app-status-badge *ngIf="!p.confirmed" kind="DRAFT" icon="schedule"></app-status-badge>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="purchaseColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: purchaseColumns;"></tr>
                </table>
              </div>
            </div>
            <ng-template #emptyPurchases>
              <div class="empty-inline">
                <mat-icon>shopping_bag</mat-icon>
                <p>{{ 'ledger.noPurchases' | t }}</p>
              </div>
            </ng-template>
          </section>

          <section class="panel entries-panel">
            <div class="block-head">
              <h3>{{ 'ledger.entries' | t }}</h3>
              <span class="count">{{ s.entries.totalElements || 0 }}</span>
            </div>

            <div *ngIf="loading" class="loading-state compact">
              <mat-icon class="spin">autorenew</mat-icon>
              <span>{{ 'ledger.refreshing' | t }}</span>
            </div>

            <ng-container *ngIf="!loading">
              <div class="panel-scroll" *ngIf="s.entries.totalElements; else emptyEntries">
                <div class="mobile-list">
                  <article class="mobile-item entry" *ngFor="let e of s.entries.content">
                    <div class="row-top">
                      <app-status-badge [kind]="e.cashBookType"></app-status-badge>
                      <strong class="tabular-nums" [class.text-danger]="e.cashBookType === 'PAYMENT'"
                              [class.text-success]="e.cashBookType === 'RECEIPT'">
                        ₹{{ e.amountPaid | number:'1.2-2' }}
                      </strong>
                    </div>
                    <div class="row-title">{{ e.narration || (e.cashBookType === 'PAYMENT' ? ('ledger.payment' | t) : ('ledger.entry' | t)) }}</div>
                    <div class="row-meta">
                      {{ e.entryDate | date:'dd MMM yyyy' }}
                      <span *ngIf="e.commodityVarietyName"> · {{ e.commodityVarietyName }}</span>
                      · bal ₹{{ e.outstandingBalanceAfter | number:'1.0-0' }}
                    </div>
                  </article>
                </div>

                <div class="table-wrap table-only">
                  <table mat-table [dataSource]="s.entries.content" class="full-table">
                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>{{ 'purchase.sort.date' | t }}</th>
                      <td mat-cell *matCellDef="let e">{{ e.entryDate | date:'dd MMM yyyy' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="type">
                      <th mat-header-cell *matHeaderCellDef>{{ 'ledger.status' | t }}</th>
                      <td mat-cell *matCellDef="let e">
                        <app-status-badge [kind]="e.cashBookType"></app-status-badge>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="narration">
                      <th mat-header-cell *matHeaderCellDef>{{ 'ledger.narration' | t }}</th>
                      <td mat-cell *matCellDef="let e" class="narration-cell">
                        <div class="cell-strong">{{ e.narration || '—' }}</div>
                        <div class="cell-meta" *ngIf="e.commodityVarietyName">{{ e.commodityVarietyName }}</div>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="amount">
                      <th mat-header-cell *matHeaderCellDef>{{ 'ledger.amountCol' | t }}</th>
                      <td mat-cell *matCellDef="let e" class="tabular-nums"
                          [class.text-danger]="e.cashBookType === 'PAYMENT'"
                          [class.text-success]="e.cashBookType === 'RECEIPT'">
                        ₹{{ e.amountPaid | number:'1.2-2' }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="outstanding">
                      <th mat-header-cell *matHeaderCellDef>{{ 'ledger.outstandingAfter' | t }}</th>
                      <td mat-cell *matCellDef="let e" class="tabular-nums">₹{{ e.outstandingBalanceAfter | number:'1.2-2' }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="entryColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: entryColumns;"></tr>
                  </table>
                </div>
              </div>
              <ng-template #emptyEntries>
                <div class="empty-inline">
                  <mat-icon>receipt_long</mat-icon>
                  <p>{{ 'ledger.noEntries' | t }}</p>
                </div>
              </ng-template>

              <mat-paginator
                *ngIf="s.entries.totalElements"
                class="panel-pager"
                [length]="s.entries.totalElements"
                [pageIndex]="entryPageIndex"
                [pageSize]="entryPageSize"
                [pageSizeOptions]="pageSizeOptions"
                [showFirstLastButtons]="true"
                (page)="onEntryPage($event)">
              </mat-paginator>
            </ng-container>
          </section>
        </div>
      </ng-container>

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

      <div class="dialog-overlay" *ngIf="showPayForm" (click)="closePayForm()">
        <div class="dialog-panel card panel-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'ledger.recordPayment' | t }}</h3>
            <button mat-icon-button type="button" (click)="closePayForm()" [attr.aria-label]="'action.close' | t">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <p class="dialog-context" *ngIf="summary">
            {{ summary.partyName }} — {{ 'ledger.outstandingLabel' | t }}
            <strong>₹{{ summary.totalOutstanding | number:'1.2-2' }}</strong>
          </p>
          <form [formGroup]="payForm" (ngSubmit)="savePayment()" class="pay-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'ledger.date' | t }}</mat-label>
              <input matInput type="date" formControlName="entryDate" id="pay-date">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'ledger.amount' | t }}</mat-label>
              <input matInput type="number" formControlName="amount" id="pay-amount" step="0.01" inputmode="decimal">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'ledger.remarks' | t }}</mat-label>
              <textarea matInput formControlName="remarks" rows="2"></textarea>
            </mat-form-field>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closePayForm()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="payForm.invalid || saving">
                {{ saving ? ('ledger.posting' | t) : ('ledger.postPayment' | t) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ledger-page {
      width: 100%;
      max-width: var(--page-max-width);
      margin: 0 auto;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    }

    .desktop-pay { display: none; }
    .table-only { display: none; }
    .mobile-only { display: flex; }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px 4px;
      margin-bottom: 12px;
    }
    .party-field {
      flex: 1 1 260px;
      min-width: 0;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 4px;
      margin-left: auto;
    }
    .icon-refresh {
      width: 40px;
      height: 40px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .icon-refresh:disabled { opacity: 0.55; cursor: default; }

    .balance-strip {
      padding: 14px 16px;
      margin-bottom: 14px;
      border-left: 3px solid var(--color-border);
      background: var(--color-surface);
    }
    .balance-strip.owe { border-left-color: var(--color-warning); }
    .balance-strip.clear { border-left-color: var(--color-success); }
    .balance-strip.credit { border-left-color: var(--color-accent); }

    .balance-main {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px 24px;
      margin-bottom: 12px;
    }
    .balance-party {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .party-type {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .balance-party strong {
      font-family: var(--font-heading);
      font-size: 1.15rem;
      font-weight: 750;
      color: var(--color-text-primary);
      line-height: 1.25;
      word-break: break-word;
    }
    .balance-amount-wrap { text-align: right; margin-left: auto; }
    .balance-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .balance-amount {
      font-family: var(--font-heading);
      font-size: clamp(1.45rem, 5vw, 1.85rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--color-text-primary);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .balance-hint {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
    .balance-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .balance-metrics div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .balance-metrics span {
      font-size: 10px;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
    }
    .balance-metrics strong {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .workspace {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }
    .panel {
      min-width: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 14px 8px;
    }
    .panel-scroll {
      min-height: 0;
    }
    .panel-pager {
      margin-top: 4px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .block-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .block-head h3 {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
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
      gap: 8px;
    }
    .mobile-item {
      padding: 12px;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .row-title {
      font-size: 14px;
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
    .due { color: var(--color-danger); font-size: 1.05rem; font-variant-numeric: tabular-nums; }
    .text-danger { color: var(--color-danger); font-weight: 650; }
    .text-success { color: var(--color-success); font-weight: 650; }

    .btn-sm { padding: 4px 12px; font-size: 12px; min-height: 34px; }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
    }
    .full-table { width: 100%; }
    .full-table th.mat-mdc-header-cell,
    .full-table td.mat-mdc-cell {
      padding: 10px 14px;
      vertical-align: middle;
      white-space: nowrap;
    }
    .full-table td.narration-cell {
      white-space: normal;
      min-width: 220px;
      max-width: 46ch;
    }
    .cell-strong { font-weight: 650; color: var(--color-text-primary); }
    .cell-meta { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

    .empty-state, .loading-state, .empty-inline {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 36px 18px;
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
      max-width: 36ch;
      font-size: 13px;
      line-height: 1.45;
    }
    .empty-state mat-icon, .empty-inline mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--color-border);
    }
    .loading-state.compact { padding: 20px; }
    .empty-inline {
      border: 1px dashed var(--color-border-subtle);
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
    }

    .pay-form { display: flex; flex-direction: column; gap: 2px; }
    .dialog-context {
      margin: 0 0 8px;
      padding: 0 4px;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

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
      .mobile-list, .mobile-only { display: none !important; }
      .table-only { display: block; }

      .toolbar {
        align-items: center;
        padding: 10px 14px 2px;
      }
      .party-field { max-width: 420px; }
      .toolbar-actions { padding-top: 0; }

      .balance-strip {
        display: flex;
        align-items: stretch;
        gap: 28px;
        padding: 14px 18px;
      }
      .balance-main {
        flex: 1 1 auto;
        margin-bottom: 0;
        align-items: flex-end;
      }
      .balance-metrics {
        flex: 0 0 240px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-top: none;
        border-left: 1px solid var(--color-border-subtle);
        padding: 0 0 0 20px;
        align-content: center;
      }
      .balance-metrics strong { font-size: 14px; }

      .workspace {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .panel {
        padding: 14px 16px 10px;
      }
      .table-wrap {
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-sm);
      }
    }

    @media (max-width: 420px) {
      .balance-amount-wrap { text-align: left; margin-left: 0; width: 100%; }
    }
  `]
})
export class LedgerComponent implements OnInit {
  parties: Party[] = [];
  filteredParties: Party[] = [];
  partyCtrl = new FormControl<string | Party | null>('');
  selectedPartyId: number | null = null;
  summary: PartyLedgerSummary | null = null;
  partyPurchases: Purchase[] = [];
  loading = false;
  saving = false;
  showPayForm = false;

  purchaseColumns = ['date', 'item', 'qty', 'net', 'stock'];
  entryColumns = ['date', 'type', 'narration', 'amount', 'outstanding'];

  pageSizeOptions = [5, 10, 25, 50];
  entryPageIndex = 0;
  entryPageSize = 10;

  payForm!: FormGroup;

  constructor(
    private ledgerService: LedgerService,
    private partyService: PartyService,
    private purchaseService: PurchaseService,
    private cashbookService: CashbookService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private i18n: I18nService
  ) {}

  ngOnInit() {
    this.payForm = this.fb.group({
      entryDate: [new Date().toISOString().slice(0, 10), Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['']
    });

    this.partyService.getAll().subscribe({
      next: res => {
        this.parties = res.data || [];
        this.filteredParties = [...this.parties];
      }
    });

    this.partyCtrl.valueChanges.subscribe(value => {
      if (value && typeof value === 'object' && 'id' in value) {
        this.filteredParties = [...this.parties];
        return;
      }
      const q = (typeof value === 'string' ? value : '').trim().toLowerCase();
      this.filteredParties = !q
        ? [...this.parties]
        : this.parties.filter(p =>
            p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
          );
      if (typeof value === 'string' && this.selectedPartyId != null) {
        const selected = this.parties.find(p => p.id === this.selectedPartyId);
        if (!selected || selected.name.toLowerCase() !== q) {
          this.selectedPartyId = null;
          this.summary = null;
          this.partyPurchases = [];
        }
      }
    });
  }

  displayParty = (value: Party | string | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return `${value.name} · ${value.type}`;
  };

  onPartySelected(party: Party) {
    this.selectedPartyId = party.id;
    this.loadLedger(true);
  }

  loadLedger(resetPages = false, reloadPurchases = true) {
    if (!this.selectedPartyId) return;
    if (resetPages) {
      this.entryPageIndex = 0;
    }
    this.loading = true;
    const partyId = this.selectedPartyId;

    const ledger$ = this.ledgerService.getPartyLedger(partyId, {
      entryPage: this.entryPageIndex,
      entrySize: this.entryPageSize
    });
    const purchases$ = reloadPurchases
      ? this.purchaseService.getAll().pipe(catchError(() => of({ data: [] as Purchase[] })))
      : of({ data: this.partyPurchases });

    forkJoin({ ledger: ledger$, purchases: purchases$ }).subscribe({
      next: ({ ledger, purchases }) => {
        this.summary = ledger.data;
        if (reloadPurchases) {
          this.partyPurchases = (purchases.data || [])
            .filter(p => p.partyId === partyId)
            .sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || '') || b.id - a.id);
        }
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snack.open(err?.error?.message || this.i18n.t('ledger.loadFailed'), 'OK', { duration: 4000 });
      }
    });
  }

  get purchaseTotal(): number {
    return this.partyPurchases.reduce((sum, p) => sum + Number(p.netPayable || 0), 0);
  }

  onEntryPage(event: PageEvent) {
    this.entryPageIndex = event.pageIndex;
    this.entryPageSize = event.pageSize;
    this.loadLedger(false, false);
  }

  openPayForm() {
    this.payForm.reset({
      entryDate: new Date().toISOString().slice(0, 10),
      amount: null,
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
      amount: Number(v.amount),
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showPayForm = false;
        this.snack.open(this.i18n.t('ledger.paymentPosted'), 'OK', { duration: 3000 });
        this.loadLedger(true);
      },
      error: err => {
        this.saving = false;
        this.snack.open(err?.error?.message || this.i18n.t('ledger.postFailed'), 'OK', { duration: 5000 });
      }
    });
  }
}
