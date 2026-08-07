import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type StatusKind =
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'UNPAID'
  | 'CONFIRMED'
  | 'DRAFT'
  | 'STOCK_OUT'
  | 'STOCK_IN'
  | 'FINALIZED'
  | 'OPEN'
  | 'RECEIPT'
  | 'PAYMENT'
  | 'OPENING_BALANCE'
  | 'EXCHANGE'
  | 'COST_INCLUDED'
  | 'RECEIVED'
  | 'ISSUED'
  | 'RETURNED'
  | 'ADJUSTMENT'
  | 'SUCCESS'
  | 'WARNING'
  | 'DANGER'
  | 'INFO';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  template: `
    <span class="status-badge" [ngClass]="toneClass" [attr.data-status]="kind">
      <span class="status-dot" aria-hidden="true"></span>
      <mat-icon *ngIf="icon" class="status-icon">{{ icon }}</mat-icon>
      <span class="status-label">{{ labelKey | t: labelFallback }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; max-width: 100%; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 26px;
      padding: 3px 10px 3px 8px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1;
      white-space: nowrap;
      max-width: 100%;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      background: currentColor;
      opacity: 0.9;
    }

    .status-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .status-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

.tone-success {
      color: var(--color-success);
      background: var(--color-success-bg);
      border-color: var(--color-success-border);
    }
    .tone-warning {
      color: var(--color-warning);
      background: var(--color-warning-bg);
      border-color: var(--color-warning-border);
    }
    .tone-danger {
      color: var(--color-danger);
      background: var(--color-danger-bg);
      border-color: var(--color-danger-border);
    }
    .tone-info {
      color: var(--color-info);
      background: var(--color-info-bg);
      border-color: var(--color-info-border);
    }
    .tone-neutral {
      color: var(--color-neutral-text);
      background: var(--color-neutral-bg);
      border-color: var(--color-neutral-border);
    }
  `]
})
export class StatusBadgeComponent {
  @Input({ required: true }) kind!: StatusKind | string;
  @Input() icon?: string;
  @Input() label?: string;

  get toneClass(): string {
    switch (this.normalized) {
      case 'PAID':
      case 'CONFIRMED':
      case 'STOCK_OUT':
      case 'STOCK_IN':
      case 'FINALIZED':
      case 'RECEIPT':
      case 'RECEIVED':
      case 'RETURNED':
      case 'SUCCESS':
        return 'tone-success';
      case 'PARTIALLY_PAID':
      case 'DRAFT':
      case 'OPEN':
      case 'ADJUSTMENT':
      case 'WARNING':
        return 'tone-warning';
      case 'UNPAID':
      case 'PAYMENT':
      case 'ISSUED':
      case 'DANGER':
        return 'tone-danger';
      case 'OPENING_BALANCE':
      case 'INFO':
      case 'EXCHANGE':
      case 'COST_INCLUDED':
        return 'tone-info';
      default:
        return 'tone-neutral';
    }
  }

  get labelKey(): string {
    if (this.label) return this.label;
    return `status.${this.normalized}`;
  }

  get labelFallback(): string {
    return this.normalized.replaceAll('_', ' ');
  }

  private get normalized(): string {
    return String(this.kind || '').toUpperCase();
  }
}
