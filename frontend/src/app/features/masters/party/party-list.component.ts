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
import { PartyService } from '../../../core/services/party.service';
import { Party } from '../../../core/models/models';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

type PartyType = Party['type'] | '';

interface TypeFilter {
  id: PartyType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-party-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule, MatSnackBarModule,
    TranslatePipe
  ],
  template: `
    <div class="party-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'parties.title' | t }}</h1>
          <p class="page-subtitle">{{ 'parties.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary desktop-add" type="button" (click)="openForm()" id="btn-add-party">
          <mat-icon>person_add</mat-icon>
          {{ 'action.add' | t }}
        </button>
      </header>

      <!-- Sticky filter bar -->
      <section class="toolbar card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input
            type="search"
            [placeholder]="'action.search' | t"
            [value]="searchQuery"
            (input)="onSearch($event)"
            id="search-party"
            autocomplete="off" />
          <button
            type="button"
            class="clear-btn"
            *ngIf="searchQuery"
            (click)="clearSearch()"
            aria-label="Clear search">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="type-scroll" role="tablist" aria-label="Party type">
          <button
            type="button"
            class="chip"
            *ngFor="let t of typeFilters"
            [class.active]="selectedType === t.id"
            (click)="filterByType(t.id)"
            [attr.id]="'filter-' + (t.id || 'all')"
            role="tab"
            [attr.aria-selected]="selectedType === t.id">
            <mat-icon>{{ t.icon }}</mat-icon>
            <span>{{ t.label }}</span>
            <em>{{ countFor(t.id) }}</em>
          </button>
        </div>
      </section>

      <div *ngIf="loading" class="loading-state card">
        <mat-icon class="spin">autorenew</mat-icon>
        <span>Loading parties…</span>
      </div>

      <ng-container *ngIf="!loading">
        <div class="result-meta" *ngIf="filteredParties.length">
          <span>{{ filteredParties.length }} part{{ filteredParties.length === 1 ? 'y' : 'ies' }}</span>
        </div>

        <!-- Mobile cards -->
        <div class="mobile-list" *ngIf="filteredParties.length; else emptyState">
          <article class="party-card card" *ngFor="let p of filteredParties" [attr.data-type]="p.type">
            <div class="card-top">
              <div class="avatar" [attr.data-type]="p.type">{{ initials(p.name) }}</div>
              <div class="card-main">
                <div class="name-row">
                  <h3>{{ p.name }}</h3>
                  <span class="type-badge" [attr.data-type]="p.type">{{ typeLabel(p.type) }}</span>
                </div>
                <p class="contact" *ngIf="p.contactPerson || p.phone">
                  <span *ngIf="p.contactPerson">{{ p.contactPerson }}</span>
                  <span *ngIf="p.contactPerson && p.phone"> · </span>
                  <a *ngIf="p.phone" class="tel" [href]="'tel:' + p.phone" (click)="$event.stopPropagation()">{{ p.phone }}</a>
                </p>
                <p class="address" *ngIf="p.address">{{ p.address }}</p>
              </div>
            </div>

            <div class="card-footer">
              <div class="balance">
                <span>Opening</span>
                <strong [class.neg]="p.openingBalance < 0" [class.pos]="p.openingBalance > 0">
                  ₹{{ p.openingBalance | number:'1.0-0' }}
                </strong>
              </div>
              <div class="card-actions">
                <a
                  *ngIf="p.phone"
                  class="icon-btn"
                  [href]="'tel:' + p.phone"
                  aria-label="Call">
                  <mat-icon>call</mat-icon>
                </a>
                <button type="button" class="icon-btn" (click)="openForm(p)" [attr.id]="'edit-party-' + p.id" aria-label="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button type="button" class="icon-btn danger" (click)="deactivate(p)" aria-label="Deactivate">
                  <mat-icon>person_off</mat-icon>
                </button>
              </div>
            </div>
          </article>
        </div>

        <ng-template #emptyState>
          <div class="empty-state card">
            <mat-icon>people_outline</mat-icon>
            <h2>{{ searchQuery || selectedType ? 'No matches' : 'No parties yet' }}</h2>
            <p *ngIf="!searchQuery && !selectedType">Add your first aadhti, buyer, mill, or transporter.</p>
            <p *ngIf="searchQuery || selectedType">Try another search or filter.</p>
            <button type="button" class="btn btn-primary" (click)="openForm()" *ngIf="!searchQuery && !selectedType">
              <mat-icon>person_add</mat-icon>
              {{ 'action.add' | t }}
            </button>
          </div>
        </ng-template>

        <!-- Desktop table -->
        <div class="card table-only table-scroll" *ngIf="filteredParties.length">
          <table mat-table [dataSource]="filteredParties" class="party-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let p">
                <div class="party-name">{{ p.name }}</div>
                <div class="party-sub" *ngIf="p.phone">{{ p.phone }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let p">
                <span class="type-badge" [attr.data-type]="p.type">{{ typeLabel(p.type) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef>Contact</th>
              <td mat-cell *matCellDef="let p">{{ p.contactPerson || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="openingBalance">
              <th mat-header-cell *matHeaderCellDef>Opening Balance</th>
              <td mat-cell *matCellDef="let p">
                <span [class.neg]="p.openingBalance < 0" [class.pos]="p.openingBalance > 0">
                  ₹{{ p.openingBalance | number:'1.2-2' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button type="button" [matMenuTriggerFor]="menu" [attr.id]="'party-action-' + p.id">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" (click)="openForm(p)">
                    <mat-icon>edit</mat-icon><span>Edit</span>
                  </button>
                  <button mat-menu-item type="button" (click)="deactivate(p)" class="text-danger">
                    <mat-icon>person_off</mat-icon><span>Deactivate</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </ng-container>

      <!-- Mobile FAB -->
      <button type="button" class="fab" (click)="openForm()" id="btn-add-party-mobile" aria-label="Add party">
        <mat-icon>person_add</mat-icon>
      </button>

      <!-- Add/Edit sheet -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ editingParty ? 'Edit Party' : 'Add New Party' }}</h3>
            <button mat-icon-button type="button" (click)="closeForm()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="partyForm" (ngSubmit)="saveParty()" class="party-form">
            <div class="form-section">
              <div class="form-section-title">Basics</div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Party Name *</mat-label>
                <input matInput formControlName="name" id="party-name" placeholder="Full name / firm" autocomplete="organization">
                <mat-error>Name is required</mat-error>
              </mat-form-field>

              <div class="type-picker" role="radiogroup" aria-label="Party type">
                <button
                  type="button"
                  class="type-option"
                  *ngFor="let t of typeOptions"
                  [class.active]="partyForm.value.type === t.id"
                  [attr.data-type]="t.id"
                  (click)="setType(t.id)">
                  <mat-icon>{{ t.icon }}</mat-icon>
                  <span>{{ t.label }}</span>
                </button>
              </div>
              <p class="field-error" *ngIf="partyForm.get('type')?.touched && partyForm.get('type')?.invalid">
                Type is required
              </p>
            </div>

            <div class="form-section">
              <div class="form-section-title">Contact</div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Contact Person</mat-label>
                  <input matInput formControlName="contactPerson" id="party-contact" autocomplete="name">
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" id="party-phone" type="tel" inputmode="tel" autocomplete="tel">
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Address</mat-label>
                <textarea matInput formControlName="address" id="party-address" rows="2" autocomplete="street-address"></textarea>
              </mat-form-field>
            </div>

            <div class="form-section">
              <div class="form-section-title">Accounts</div>
              <div class="form-row">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>GSTIN</mat-label>
                  <input matInput formControlName="gstin" id="party-gstin" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Opening Balance (₹)</mat-label>
                  <input matInput type="number" formControlName="openingBalance" id="party-opening-balance" inputmode="decimal" placeholder="0">
                  <mat-hint>+ we owe them · − they owe us</mat-hint>
                </mat-form-field>
              </div>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="party-save"
                      [disabled]="partyForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving…' : (editingParty ? 'Update' : 'Save Party') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .party-page {
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
    .search-box mat-icon {
      color: var(--color-text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .search-box input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      font: inherit;
      font-size: 16px;
      color: var(--color-text-primary);
    }
    .clear-btn {
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 8px;
      padding: 0;
    }
    .clear-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .type-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .type-scroll::-webkit-scrollbar { display: none; }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
      min-height: 38px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 12px;
      font-weight: 650;
      font-family: inherit;
      white-space: nowrap;
    }
    .chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
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
      color: var(--color-text-muted);
    }
    .chip.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }
    .chip.active em {
      background: rgba(255, 255, 255, 0.22);
      color: #fff;
    }

    .result-meta {
      font-size: 12px;
      font-weight: 650;
      color: var(--color-text-muted);
      margin: 0 2px 10px;
    }

    .mobile-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .party-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .card-top {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-weight: 750;
      font-size: 14px;
      letter-spacing: 0.02em;
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
    }
    .avatar[data-type="AADHTI"] { background: rgba(196, 92, 38, 0.14); color: #9A4519; }
    .avatar[data-type="BUYER"] { background: rgba(31, 111, 191, 0.14); color: #1A5A9C; }
    .avatar[data-type="MILL"] { background: rgba(21, 153, 71, 0.14); color: #0F6B36; }
    .avatar[data-type="TRANSPORTER"] { background: rgba(217, 119, 6, 0.14); color: #9A5505; }

    .card-main { min-width: 0; flex: 1; }
    .name-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }
    .name-row h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 750;
      color: var(--color-text-primary);
      line-height: 1.25;
      word-break: break-word;
    }
    .contact, .address {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }
    .address {
      color: var(--color-text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-top: 2px;
    }
    .tel {
      color: var(--color-accent);
      text-decoration: none;
      font-weight: 650;
    }

    .type-badge {
      flex-shrink: 0;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }
    .type-badge[data-type="AADHTI"] { background: rgba(196, 92, 38, 0.14); color: #9A4519; }
    .type-badge[data-type="BUYER"] { background: rgba(31, 111, 191, 0.14); color: #1A5A9C; }
    .type-badge[data-type="MILL"] { background: rgba(21, 153, 71, 0.14); color: #0F6B36; }
    .type-badge[data-type="TRANSPORTER"] { background: rgba(217, 119, 6, 0.14); color: #9A5505; }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--color-border-subtle);
    }
    .balance {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .balance span {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .balance strong {
      font-size: 15px;
      font-weight: 750;
      color: var(--color-text-primary);
    }
    .pos { color: var(--color-warning) !important; }
    .neg { color: var(--color-success) !important; }

    .card-actions {
      display: inline-flex;
      gap: 6px;
    }
    .icon-btn {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-decoration: none;
      padding: 0;
    }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .icon-btn.danger { color: var(--color-danger); }
    .icon-btn:active { transform: scale(0.96); }

    .table-only { display: none; }
    .party-table { width: 100%; }
    .party-name { font-weight: 650; }
    .party-sub { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

    .empty-state, .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px 20px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .empty-state h2 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: 1.1rem;
      color: var(--color-text-primary);
    }
    .empty-state p { margin: 0; max-width: 30ch; font-size: 13px; line-height: 1.45; }
    .empty-state mat-icon, .loading-state mat-icon {
      font-size: 42px;
      width: 42px;
      height: 42px;
      color: var(--color-border);
    }

    .fab {
      position: fixed;
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      z-index: 40;
      width: 56px;
      height: 56px;
      border: none;
      border-radius: 18px;
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 8px 24px var(--color-primary-shadow);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .fab mat-icon { font-size: 26px; width: 26px; height: 26px; }

    .party-form { display: flex; flex-direction: column; gap: 2px; }

    .type-picker {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 4px 0 8px;
    }
    .type-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 72px;
      padding: 10px 8px;
      border-radius: 14px;
      border: 1.5px solid var(--color-border);
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
    }
    .type-option mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .type-option.active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent);
    }
    .field-error {
      margin: -4px 0 8px;
      font-size: 12px;
      color: var(--color-danger);
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (min-width: 900px) {
      .party-page { padding-bottom: 24px; }
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
      .search-box { flex: 1; max-width: 360px; }
      .type-scroll { flex: 1; }
    }
  `]
})
export class PartyListComponent implements OnInit {
  displayedColumns = ['name', 'type', 'contact', 'openingBalance', 'actions'];
  parties: Party[] = [];
  filteredParties: Party[] = [];
  selectedType: PartyType = '';
  searchQuery = '';
  loading = false;
  showForm = false;
  saving = false;
  editingParty: Party | null = null;
  partyForm: FormGroup;

  typeFilters: TypeFilter[] = [
    { id: '', label: 'All', icon: 'groups' },
    { id: 'AADHTI', label: 'Aadhti', icon: 'agriculture' },
    { id: 'BUYER', label: 'Buyer', icon: 'storefront' },
    { id: 'MILL', label: 'Mill', icon: 'factory' },
    { id: 'TRANSPORTER', label: 'Transport', icon: 'local_shipping' },
  ];

  typeOptions = this.typeFilters.filter(t => t.id) as { id: Party['type']; label: string; icon: string }[];

  constructor(
    private partyService: PartyService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.partyForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      contactPerson: [''],
      phone: [''],
      address: [''],
      gstin: [''],
      openingBalance: [0]
    });
  }

  ngOnInit() { this.loadParties(); }

  loadParties() {
    this.loading = true;
    this.partyService.getAll().subscribe({
      next: res => {
        this.parties = res.data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  countFor(type: PartyType): number {
    if (!type) return this.parties.length;
    return this.parties.filter(p => p.type === type).length;
  }

  typeLabel(type: Party['type']): string {
    return this.typeOptions.find(t => t.id === type)?.label || type;
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  filterByType(type: PartyType) {
    this.selectedType = type;
    this.applyFilter();
  }

  onSearch(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value || '';
    this.applyFilter();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilter();
  }

  applyFilter() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredParties = this.parties.filter(p => {
      const typeOk = !this.selectedType || p.type === this.selectedType;
      if (!typeOk) return false;
      if (!q) return true;
      return [p.name, p.contactPerson, p.phone, p.address, p.gstin, p.type]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  }

  setType(type: Party['type']) {
    this.partyForm.patchValue({ type });
    this.partyForm.get('type')?.markAsTouched();
  }

  openForm(party?: Party) {
    this.editingParty = party ?? null;
    if (party) {
      this.partyForm.patchValue(party);
    } else {
      this.partyForm.reset({ openingBalance: 0, type: this.selectedType || '' });
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingParty = null;
    this.partyForm.reset({ openingBalance: 0 });
  }

  saveParty() {
    this.partyForm.markAllAsTouched();
    if (this.partyForm.invalid) return;
    this.saving = true;
    const data = this.partyForm.value;
    const obs = this.editingParty
      ? this.partyService.update(this.editingParty.id, data)
      : this.partyService.create(data);

    obs.subscribe({
      next: () => {
        this.snackBar.open(
          `Party ${this.editingParty ? 'updated' : 'created'} successfully`, 'Close',
          { duration: 3000, panelClass: 'snack-success' }
        );
        this.saving = false;
        this.closeForm();
        this.loadParties();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message ?? 'Failed to save party', 'Close',
          { duration: 4000, panelClass: 'snack-error' });
        this.saving = false;
      }
    });
  }

  deactivate(party: Party) {
    if (!confirm(`Deactivate "${party.name}"? They will be hidden from dropdowns.`)) return;
    this.partyService.deactivate(party.id).subscribe({
      next: () => {
        this.snackBar.open('Party deactivated', 'Close', { duration: 2000 });
        this.loadParties();
      }
    });
  }
}
