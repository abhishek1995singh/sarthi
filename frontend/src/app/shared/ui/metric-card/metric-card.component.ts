import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export type MetricTone = 'default' | 'positive' | 'negative' | 'info';

/**
 * A single-accent metric tile. Replaces the old pattern of giving every
 * dashboard card a different colored left border — color is now reserved
 * for `tone`, used only when the number itself is signed (receivable/payable).
 */
@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <ng-container *ngIf="link; else plain">
      <a class="metric-card" [routerLink]="link" [attr.data-tone]="tone">
        <ng-container *ngTemplateOutlet="body"></ng-container>
      </a>
    </ng-container>
    <ng-template #plain>
      <div class="metric-card" [attr.data-tone]="tone">
        <ng-container *ngTemplateOutlet="body"></ng-container>
      </div>
    </ng-template>

    <ng-template #body>
      <div class="metric-head">
        <span class="metric-icon"><mat-icon>{{ icon }}</mat-icon></span>
        <mat-icon *ngIf="link" class="metric-chevron">chevron_right</mat-icon>
      </div>
      <div class="metric-value tabular-nums">{{ value }}</div>
      <div class="metric-label">{{ label }}</div>
      <div class="metric-hint" *ngIf="hint">{{ hint }}</div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      height: 100%;
      padding: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
    }

    a.metric-card { cursor: pointer; }
    a.metric-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--color-border);
      transform: translateY(-1px);
    }

    .metric-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .metric-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .metric-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .metric-chevron {
      color: var(--color-text-muted);
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .metric-value {
      font-family: var(--font-heading);
      font-size: clamp(1.15rem, 2.4vw, 1.4rem);
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .metric-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .metric-hint {
      font-size: 11.5px;
      color: var(--color-text-muted);
    }

    .metric-card[data-tone='positive'] .metric-icon {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
    .metric-card[data-tone='positive'] .metric-value { color: var(--color-success); }

    .metric-card[data-tone='negative'] .metric-icon {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }
    .metric-card[data-tone='negative'] .metric-value { color: var(--color-danger); }

    .metric-card[data-tone='info'] .metric-icon {
      background: var(--color-info-bg);
      color: var(--color-info);
    }
  `]
})
export class MetricCardComponent {
  @Input() icon = 'insights';
  @Input() value = '';
  @Input() label = '';
  @Input() hint = '';
  @Input() tone: MetricTone = 'default';
  @Input() link?: string | any[];
}
