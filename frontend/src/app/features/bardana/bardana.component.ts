import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BardanaService } from '../../core/services/bardana.service';
import { PartyService } from '../../core/services/party.service';
import { CommodityService } from '../../core/services/commodity.service';
import {
  BardanaBalance,
  BardanaTransaction,
  Commodity,
  CommodityVariety,
  Party
} from '../../core/models/models';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

interface PartyBalanceGroup {
  partyId: number;
  partyName: string;
  totalBags: number;
  rows: BardanaBalance[];
}

type TypeFilter = '' | 'RECEIVED' | 'ISSUED' | 'RETURNED' | 'ADJUSTMENT';

@Component({
  selector: 'app-bardana',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    TranslatePipe
  ],
  template: `
    <div class="bardana-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'bardana.title' | t }}</h1>
          <p class="page-subtitle">{{ 'bardana.subtitle' | t }}</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openForm()" id="btn-add-bardana">
          <mat-icon>add</mat-icon>
          {{ 'bardana.record' | t }}
        </button>
      </header>

      <!-- Meaning strip -->
      <div class="legend card">
        <div class="legend-item">
          <span class="dot in"></span>
          <div>
            <strong>{{ 'bardana.legend.in' | t }}</strong>
            <span>{{ 'bardana.legend.inHint' | t }}</span>
          </div>
        </div>
        <div class="legend-item">
          <span class="dot out"></span>
          <div>
            <strong>{{ 'bardana.legend.out' | t }}</strong>
            <span>{{ 'bardana.legend.outHint' | t }}</span>
          </div>
        </div>
      </div>

      <!-- KPI -->
      <section class="kpi-row">
        <div class="kpi card">
          <div class="kpi-label">{{ 'bardana.kpi.parties' | t }}</div>
          <div class="kpi-value">{{ partyGroups.length }}</div>
        </div>
        <div class="kpi card">
          <div class="kpi-label">{{ 'bardana.kpi.netBags' | t }}</div>
          <div class="kpi-value" [class.pos]="netBags > 0" [class.neg]="netBags < 0">{{ netBags }}</div>
        </div>
        <div class="kpi card">
          <div class="kpi-label">{{ 'bardana.kpi.entries' | t }}</div>
          <div class="kpi-value">{{ transactions.length }}</div>
        </div>
      </section>

      <!-- Balances by party -->
      <section class="section">
        <div class="section-head">
          <h2>{{ 'bardana.balances' | t }}</h2>
        </div>

        <div *ngIf="loadingBalances" class="loading-state card">
          <mat-icon class="spin">autorenew</mat-icon>
        </div>

        <div class="party-list" *ngIf="!loadingBalances && partyGroups.length; else noBalances">
          <article class="party-card card" *ngFor="let g of partyGroups">
            <button type="button" class="party-head" (click)="toggleParty(g.partyId)">
              <div class="party-avatar">{{ g.partyName.charAt(0) }}</div>
              <div class="party-copy">
                <div class="party-name">{{ g.partyName }}</div>
                <div class="party-meta">{{ g.rows.length }} {{ 'bardana.varieties' | t }}</div>
              </div>
              <div class="party-total" [class.pos]="g.totalBags > 0" [class.neg]="g.totalBags < 0">
                <span class="num">{{ g.totalBags > 0 ? '+' : '' }}{{ g.totalBags }}</span>
                <span class="unit">bags</span>
              </div>
              <mat-icon class="chev">{{ expandedPartyId === g.partyId ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>

            <div class="party-body" *ngIf="expandedPartyId === g.partyId">
              <div class="variety-row" *ngFor="let r of g.rows">
                <div class="variety-copy">
                  <div class="variety-name">{{ r.commodityVarietyName }}</div>
                  <div class="variety-meta">{{ r.commodityName }}</div>
                </div>
                <div class="variety-bags" [class.pos]="r.balanceBags > 0" [class.neg]="r.balanceBags < 0">
                  {{ r.balanceBags > 0 ? '+' : '' }}{{ r.balanceBags }}
                </div>
              </div>
            </div>
          </article>
        </div>
        <ng-template #noBalances>
          <div class="empty card" *ngIf="!loadingBalances">{{ 'bardana.noBalances' | t }}</div>
        </ng-template>
      </section>

      <!-- Activity -->
      <section class="section">
        <div class="section-head">
          <h2>{{ 'bardana.entries' | t }}</h2>
        </div>

        <div class="filters">
          <button type="button" class="chip" [class.active]="typeFilter === ''" (click)="typeFilter = ''">{{ 'filter.all' | t }}</button>
          <button type="button" class="chip" [class.active]="typeFilter === 'RECEIVED'" (click)="typeFilter = 'RECEIVED'">{{ 'status.RECEIVED' | t }}</button>
          <button type="button" class="chip" [class.active]="typeFilter === 'ISSUED'" (click)="typeFilter = 'ISSUED'">{{ 'status.ISSUED' | t }}</button>
          <button type="button" class="chip" [class.active]="typeFilter === 'RETURNED'" (click)="typeFilter = 'RETURNED'">{{ 'status.RETURNED' | t }}</button>
          <button type="button" class="chip" [class.active]="typeFilter === 'ADJUSTMENT'" (click)="typeFilter = 'ADJUSTMENT'">{{ 'status.ADJUSTMENT' | t }}</button>
        </div>

        <div *ngIf="loading" class="loading-state card">
          <mat-icon class="spin">autorenew</mat-icon>
        </div>

        <div class="activity" *ngIf="!loading && filteredTx.length; else noTx">
          <article class="activity-card card" *ngFor="let t of filteredTx">
            <div class="act-top">
              <span class="combo-badge" [attr.data-type]="t.type">
                <span class="combo-main">{{ typeLabel(t.type) }}</span>
                <span class="combo-sep" aria-hidden="true">·</span>
                <span class="combo-mode">{{ modeLabel(t.mode) }}</span>
              </span>
              <div class="act-bags" [attr.data-type]="t.type">
                <span class="sign">{{ bagSign(t.type) }}</span>{{ t.bags | number }}
                <span class="unit">bags</span>
              </div>
            </div>

            <div class="act-title">{{ t.partyName }}</div>
            <div class="act-meta">
              {{ t.transactionDate | date:'dd MMM yyyy' }}
              · {{ t.commodityName }} / {{ t.commodityVarietyName }}
            </div>

            <div class="act-foot">
              <span class="link-pill" *ngIf="t.linkedPurchaseId">
                <mat-icon>shopping_bag</mat-icon> Purchase #{{ t.linkedPurchaseId }}
              </span>
              <span class="link-pill" *ngIf="t.linkedSaleId">
                <mat-icon>sell</mat-icon> Sale #{{ t.linkedSaleId }}
              </span>
              <span class="link-pill muted" *ngIf="!t.linkedPurchaseId && !t.linkedSaleId">
                <mat-icon>edit_note</mat-icon> {{ 'bardana.manual' | t }}
              </span>
              <span class="amount" *ngIf="t.amount != null">₹{{ t.amount | number:'1.0-0' }}</span>
              <button mat-icon-button type="button" class="del"
                      *ngIf="!t.linkedPurchaseId && !t.linkedSaleId"
                      (click)="deleteTx(t)" [attr.aria-label]="'action.close' | t">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
            <p class="remarks" *ngIf="t.remarks">{{ t.remarks }}</p>
          </article>
        </div>
        <ng-template #noTx>
          <div class="empty card" *ngIf="!loading">
            <mat-icon>inventory_2</mat-icon>
            <p>{{ 'bardana.empty' | t }}</p>
          </div>
        </ng-template>
      </section>

      <!-- Form dialog -->
      <div class="dialog-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ 'bardana.record' | t }}</h3>
            <button mat-icon-button type="button" (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="dialog-body form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="transactionDate">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="RECEIVED">{{ 'status.RECEIVED' | t }}</mat-option>
                <mat-option value="ISSUED">{{ 'status.ISSUED' | t }}</mat-option>
                <mat-option value="RETURNED">{{ 'status.RETURNED' | t }}</mat-option>
                <mat-option value="ADJUSTMENT">{{ 'status.ADJUSTMENT' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Party</mat-label>
              <mat-select formControlName="partyId">
                <mat-option *ngFor="let p of parties" [value]="p.id">{{ p.name }} ({{ p.type }})</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Commodity</mat-label>
              <mat-select formControlName="commodityId" (selectionChange)="onCommodityChange($event.value)">
                <mat-option *ngFor="let c of commodities" [value]="c.id">{{ c.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Variety</mat-label>
              <mat-select formControlName="commodityVarietyId">
                <mat-option *ngFor="let v of varieties" [value]="v.id">{{ v.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Bags</mat-label>
              <input matInput type="number" formControlName="bags">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Mode</mat-label>
              <mat-select formControlName="mode">
                <mat-option value="EXCHANGE">{{ 'status.EXCHANGE' | t }}</mat-option>
                <mat-option value="COST_INCLUDED">{{ 'status.COST_INCLUDED' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Amount (optional)</mat-label>
              <input matInput type="number" formControlName="amount">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-span">
              <mat-label>Remarks</mat-label>
              <input matInput formControlName="remarks">
            </mat-form-field>
            <div class="dialog-actions full-span">
              <button type="button" class="btn btn-ghost" (click)="closeForm()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving">
                {{ 'action.save' | t }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bardana-page { max-width: 920px; margin: 0 auto; padding-bottom: 28px; }

    .legend {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .legend-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .legend-item strong { display: block; font-size: 13px; }
    .legend-item span { display: block; font-size: 12px; color: var(--color-text-muted); margin-top: 2px; line-height: 1.35; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0;
    }
    .dot.in { background: var(--color-success); }
    .dot.out { background: var(--color-danger); }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 18px;
    }
    .kpi { padding: 12px; text-align: center; }
    .kpi-label { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi-value { font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; margin-top: 4px; letter-spacing: -0.02em; }
    .kpi-value.pos, .party-total.pos .num, .variety-bags.pos { color: var(--color-success); }
    .kpi-value.neg, .party-total.neg .num, .variety-bags.neg { color: var(--color-danger); }

    .section { margin-top: 8px; }
    .section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin: 8px 0 10px;
    }
    .section-head h2 { margin: 0; font-size: 1rem; font-weight: 700; }

    .party-list { display: flex; flex-direction: column; gap: 8px; }
    .party-card { padding: 0; overflow: hidden; }
    .party-head {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      color: inherit;
      text-align: left;
      min-height: 64px;
    }
    .party-avatar {
      width: 40px; height: 40px; border-radius: 12px;
      display: grid; place-items: center;
      background: var(--color-primary-soft);
      color: var(--color-primary-dark);
      font-weight: 800;
      flex-shrink: 0;
    }
    .party-copy { flex: 1; min-width: 0; }
    .party-name { font-weight: 700; font-size: 14px; }
    .party-meta { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
    .party-total { text-align: right; }
    .party-total .num { display: block; font-family: var(--font-heading); font-weight: 800; font-size: 1.15rem; line-height: 1; }
    .party-total .unit { font-size: 10px; color: var(--color-text-muted); font-weight: 600; }
    .chev { color: var(--color-text-muted); }

    .party-body {
      border-top: 1px solid var(--color-border-subtle);
      padding: 4px 14px 10px;
    }
    .variety-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed var(--color-border-subtle);
    }
    .variety-row:last-child { border-bottom: none; }
    .variety-name { font-weight: 650; font-size: 13px; }
    .variety-meta { font-size: 11px; color: var(--color-text-muted); }
    .variety-bags { font-weight: 800; font-size: 14px; }

    .filters {
      display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch;
      padding-bottom: 10px; margin-bottom: 4px;
    }
    .chip {
      flex: 0 0 auto;
      min-height: 36px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
    }
    .chip.active {
      background: var(--color-primary-soft);
      border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
      color: var(--color-primary-dark);
    }

    .activity { display: flex; flex-direction: column; gap: 8px; }
    .activity-card { padding: 14px; }

    .act-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    /* Combined type + mode badge */
    .combo-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 28px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 11px;
      font-weight: 700;
      max-width: 100%;
    }
    .combo-main { white-space: nowrap; }
    .combo-sep { opacity: 0.55; }
    .combo-mode { font-weight: 600; opacity: 0.85; white-space: nowrap; }

    .combo-badge[data-type='RECEIVED'],
    .combo-badge[data-type='RETURNED'] {
      color: var(--color-success);
      background: var(--color-success-bg);
      border-color: var(--color-success-border);
    }
    .combo-badge[data-type='ISSUED'] {
      color: var(--color-danger);
      background: var(--color-danger-bg);
      border-color: var(--color-danger-border);
    }
    .combo-badge[data-type='ADJUSTMENT'] {
      color: var(--color-warning);
      background: var(--color-warning-bg);
      border-color: var(--color-warning-border);
    }

    .act-bags {
      display: inline-flex;
      align-items: baseline;
      gap: 3px;
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }
    .act-bags .unit { font-size: 11px; font-weight: 600; color: var(--color-text-muted); margin-left: 2px; }
    .act-bags[data-type='RECEIVED'],
    .act-bags[data-type='RETURNED'] { color: var(--color-success); }
    .act-bags[data-type='ISSUED'] { color: var(--color-danger); }
    .act-bags[data-type='ADJUSTMENT'] { color: var(--color-warning); }

    .act-title { font-weight: 750; font-size: 14px; }
    .act-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; line-height: 1.35; }

    .act-foot {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .link-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 26px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      font-size: 11px;
      font-weight: 650;
      color: var(--color-text-secondary);
    }
    .link-pill mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .link-pill.muted { color: var(--color-text-muted); }
    .amount { margin-left: auto; font-weight: 750; font-size: 13px; }
    .del { margin-left: auto; color: var(--color-text-muted); }
    .remarks {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--color-text-secondary);
      line-height: 1.4;
    }

    .empty {
      text-align: center;
      color: var(--color-text-muted);
      font-size: 13px;
      padding: 28px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .empty mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--color-border); }
    .loading-state {
      display: flex; justify-content: center; padding: 28px; color: var(--color-text-secondary);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    .full-span { grid-column: 1 / -1; }

    @media (min-width: 720px) {
      .legend { grid-template-columns: 1fr 1fr; }
      .kpi-row { gap: 12px; }
    }
    @media (max-width: 719px) {
      .form-grid { grid-template-columns: 1fr; }
      .page-header .btn { width: 100%; }
    }
  `]
})
export class BardanaComponent implements OnInit {
  transactions: BardanaTransaction[] = [];
  balances: BardanaBalance[] = [];
  partyGroups: PartyBalanceGroup[] = [];
  parties: Party[] = [];
  commodities: Commodity[] = [];
  varieties: CommodityVariety[] = [];
  loading = false;
  loadingBalances = false;
  showForm = false;
  saving = false;
  form!: FormGroup;
  typeFilter: TypeFilter = '';
  expandedPartyId: number | null = null;
  netBags = 0;

  constructor(
    private bardanaService: BardanaService,
    private partyService: PartyService,
    private commodityService: CommodityService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private i18n: I18nService
  ) {}

  ngOnInit() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.form = this.fb.group({
      transactionDate: [`${y}-${m}-${d}`, Validators.required],
      type: ['RETURNED', Validators.required],
      partyId: [null, Validators.required],
      commodityId: [null, Validators.required],
      commodityVarietyId: [null, Validators.required],
      bags: [1, [Validators.required]],
      mode: ['EXCHANGE', Validators.required],
      amount: [null],
      remarks: ['']
    });
    this.load();
    this.partyService.getAll().subscribe(r => this.parties = r.data || []);
    this.commodityService.getAll().subscribe(r => this.commodities = r.data || []);
  }

  get filteredTx(): BardanaTransaction[] {
    if (!this.typeFilter) return this.transactions;
    return this.transactions.filter(t => t.type === this.typeFilter);
  }

  load() {
    this.loading = true;
    this.loadingBalances = true;
    this.bardanaService.list().subscribe({
      next: r => { this.transactions = r.data || []; this.loading = false; },
      error: () => { this.loading = false; this.snack.open('Failed to load bardana entries', 'OK', { duration: 3000 }); }
    });
    this.bardanaService.balances().subscribe({
      next: r => {
        this.balances = r.data || [];
        this.partyGroups = this.groupBalances(this.balances);
        this.netBags = this.balances.reduce((s, b) => s + Number(b.balanceBags || 0), 0);
        if (this.partyGroups.length && this.expandedPartyId == null) {
          this.expandedPartyId = this.partyGroups[0].partyId;
        }
        this.loadingBalances = false;
      },
      error: () => { this.loadingBalances = false; }
    });
  }

  private groupBalances(rows: BardanaBalance[]): PartyBalanceGroup[] {
    const map = new Map<number, PartyBalanceGroup>();
    for (const r of rows) {
      let g = map.get(r.partyId);
      if (!g) {
        g = { partyId: r.partyId, partyName: r.partyName, totalBags: 0, rows: [] };
        map.set(r.partyId, g);
      }
      g.rows.push(r);
      g.totalBags += Number(r.balanceBags || 0);
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.totalBags) - Math.abs(a.totalBags));
  }

  toggleParty(partyId: number) {
    this.expandedPartyId = this.expandedPartyId === partyId ? null : partyId;
  }

  typeLabel(type: string): string {
    return this.i18n.t(`status.${type}`, type);
  }

  modeLabel(mode: string): string {
    return this.i18n.t(`status.${mode}`, mode);
  }

  bagSign(type: string): string {
    if (type === 'ISSUED') return '−';
    if (type === 'RECEIVED' || type === 'RETURNED') return '+';
    return '';
  }

  onCommodityChange(commodityId: number) {
    const c = this.commodities.find(x => x.id === commodityId);
    if (c?.varieties?.length) {
      this.varieties = c.varieties;
      this.applyFirstVariety();
      return;
    }
    this.commodityService.getVarieties(commodityId).subscribe(r => {
      this.varieties = r.data || [];
      this.applyFirstVariety();
    });
  }

  private applyFirstVariety() {
    this.form.patchValue({ commodityVarietyId: null });
    const first = this.varieties[0];
    if (first) {
      this.form.patchValue({
        commodityVarietyId: first.id,
        mode: first.settings?.bardanaMode || 'EXCHANGE'
      });
    }
  }

  openForm() { this.showForm = true; }
  closeForm() { this.showForm = false; }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    this.bardanaService.create({
      transactionDate: v.transactionDate,
      type: v.type,
      partyId: v.partyId,
      commodityVarietyId: v.commodityVarietyId,
      bags: Number(v.bags),
      mode: v.mode,
      amount: v.amount != null && v.amount !== '' ? Number(v.amount) : undefined,
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.closeForm();
        this.snack.open('Bardana entry saved', 'OK', { duration: 2500 });
        this.load();
      },
      error: err => {
        this.saving = false;
        this.snack.open(err?.error?.message || 'Save failed', 'OK', { duration: 3500 });
      }
    });
  }

  deleteTx(t: BardanaTransaction) {
    if (!confirm('Delete this bardana entry?')) return;
    this.bardanaService.delete(t.id).subscribe({
      next: () => {
        this.snack.open('Deleted', 'OK', { duration: 2000 });
        this.load();
      },
      error: err => this.snack.open(err?.error?.message || 'Delete failed', 'OK', { duration: 3500 })
    });
  }
}
