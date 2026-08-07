import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PartyService } from '../../../core/services/party.service';
import { Party } from '../../../core/models/models';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-party-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatMenuModule, MatChipsModule, MatSnackBarModule, TranslatePipe
  ],
  template: `
    <div class="party-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ 'parties.title' | t }}</h1>
          <p class="page-subtitle">{{ 'parties.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" (click)="openForm()" id="btn-add-party">
          <mat-icon>add</mat-icon>
          {{ 'action.add' | t }}
        </button>
      </div>

      <!-- Type Filter Chips -->
      <div class="filter-chips mb-lg">
        <button class="chip" [class.active]="selectedType === ''"
                (click)="filterByType('')" id="filter-all">All</button>
        <button class="chip" [class.active]="selectedType === 'AADHTI'"
                (click)="filterByType('AADHTI')" id="filter-aadhti">Aadhtis</button>
        <button class="chip" [class.active]="selectedType === 'BUYER'"
                (click)="filterByType('BUYER')" id="filter-buyer">Buyers</button>
        <button class="chip" [class.active]="selectedType === 'MILL'"
                (click)="filterByType('MILL')" id="filter-mill">Mills</button>
        <button class="chip" [class.active]="selectedType === 'TRANSPORTER'"
                (click)="filterByType('TRANSPORTER')" id="filter-transporter">Transporters</button>
      </div>

      <!-- Table -->
      <div class="card">
        <div *ngIf="loading" class="loading-state">
          <mat-icon class="spin">autorenew</mat-icon>
          Loading parties...
        </div>

        <div class="table-scroll" *ngIf="!loading">
        <table mat-table [dataSource]="filteredParties" class="party-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let p">
              <div class="party-name">{{ p.name }}</div>
              <div class="party-sub" *ngIf="p.phone">📞 {{ p.phone }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let p">
              <span class="type-badge" [attr.data-type]="p.type">{{ p.type }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>Contact Person</th>
            <td mat-cell *matCellDef="let p">{{ p.contactPerson || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="openingBalance">
            <th mat-header-cell *matHeaderCellDef>Opening Balance</th>
            <td mat-cell *matCellDef="let p">
              <span [class]="p.openingBalance >= 0 ? 'amount-neutral' : 'amount-negative'">
                ₹{{ p.openingBalance | number:'1.2-2' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button [matMenuTriggerFor]="menu" [attr.id]="'party-action-' + p.id">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="openForm(p)">
                  <mat-icon>edit</mat-icon><span>Edit</span>
                </button>
                <button mat-menu-item (click)="deactivate(p)" class="text-danger">
                  <mat-icon color="warn">delete_outline</mat-icon><span>Deactivate</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr *matNoDataRow class="mat-row">
            <td class="no-data" [attr.colspan]="displayedColumns.length">
              <mat-icon>people_outline</mat-icon>
              <p>No parties found. Add your first party using the button above.</p>
            </td>
          </tr>
        </table>
        </div>
      </div>

      <!-- Add/Edit Dialog -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ editingParty ? 'Edit Party' : 'Add New Party' }}</h3>
            <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <form [formGroup]="partyForm" (ngSubmit)="saveParty()" class="party-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Party Name *</mat-label>
                <input matInput formControlName="name" id="party-name" placeholder="Enter full name">
                <mat-error>Name is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Type *</mat-label>
                <mat-select formControlName="type" id="party-type">
                  <mat-option value="AADHTI">Aadhti (Supplier)</mat-option>
                  <mat-option value="BUYER">Buyer</mat-option>
                  <mat-option value="MILL">Mill</mat-option>
                  <mat-option value="TRANSPORTER">Transporter</mat-option>
                </mat-select>
                <mat-error>Type is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Contact Person</mat-label>
                <input matInput formControlName="contactPerson" id="party-contact" placeholder="Contact name">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone" id="party-phone" placeholder="Mobile number">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Address</mat-label>
              <textarea matInput formControlName="address" id="party-address" rows="2"></textarea>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>GSTIN</mat-label>
                <input matInput formControlName="gstin" id="party-gstin">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Opening Balance (₹)</mat-label>
                <input matInput type="number" formControlName="openingBalance" id="party-opening-balance" placeholder="0.00">
                <mat-hint>Positive = we owe them; Negative = they owe us</mat-hint>
              </mat-form-field>
            </div>

            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="party-save"
                      [disabled]="partyForm.invalid || saving">
                <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
                {{ saving ? 'Saving...' : 'Save Party' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .party-page { max-width: 1200px; }

    .filter-chips { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

    .chip {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .chip:hover { border-color: var(--color-primary); color: var(--color-primary-light); }
    .chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

    .party-table { width: 100%; }

    .party-name { font-weight: 500; }
    .party-sub  { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

    .type-badge {
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    [data-type="AADHTI"]     { background: rgba(212,98,42,0.15);  color: #E8854E; }
    [data-type="BUYER"]      { background: rgba(42,125,212,0.15); color: #5BA0E8; }
    [data-type="MILL"]       { background: rgba(34,197,94,0.15);  color: #22C55E; }
    [data-type="TRANSPORTER"]{ background: rgba(245,158,11,0.15); color: #F59E0B; }

    .loading-state, .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-2xl);
      color: var(--color-text-muted);
      gap: var(--space-sm);
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .party-form { display: flex; flex-direction: column; gap: var(--space-md); }

    .dialog-panel { max-width: 620px; }

    .dialog-actions {
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border-subtle);
    }

    @media (max-width: 640px) {
      .table-scroll { margin: 0 -4px; }
    }
  `]
})
export class PartyListComponent implements OnInit {
  displayedColumns = ['name', 'type', 'contact', 'openingBalance', 'actions'];
  parties: Party[] = [];
  filteredParties: Party[] = [];
  selectedType = '';
  loading = false;
  showForm = false;
  saving = false;
  editingParty: Party | null = null;
  partyForm: FormGroup;

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
        this.parties = res.data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  filterByType(type: string) {
    this.selectedType = type;
    this.applyFilter();
  }

  applyFilter() {
    this.filteredParties = this.selectedType
      ? this.parties.filter(p => p.type === this.selectedType)
      : [...this.parties];
  }

  openForm(party?: Party) {
    this.editingParty = party ?? null;
    if (party) {
      this.partyForm.patchValue(party);
    } else {
      this.partyForm.reset({ openingBalance: 0 });
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingParty = null;
    this.partyForm.reset({ openingBalance: 0 });
  }

  saveParty() {
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
    if (!confirm(`Deactivate party "${party.name}"? This will hide them from all dropdowns.`)) return;
    this.partyService.deactivate(party.id).subscribe({
      next: () => {
        this.snackBar.open('Party deactivated', 'Close', { duration: 2000 });
        this.loadParties();
      }
    });
  }
}
