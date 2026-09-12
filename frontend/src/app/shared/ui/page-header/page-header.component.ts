import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shared page title block — replaces the hand-rolled `.page-header` /
 * `.page-title` / `.page-subtitle` markup that used to be copy-pasted
 * into every feature screen.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-head-eyebrow" *ngIf="eyebrow">{{ eyebrow }}</p>
        <h1 class="page-head-title">{{ title }}</h1>
        <p class="page-head-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-head-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .page-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .page-head-copy { min-width: 0; }

    .page-head-eyebrow {
      font-family: var(--font-heading);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-primary);
      margin-bottom: 2px;
    }

    .page-head-title {
      font-family: var(--font-heading);
      font-size: clamp(1.3rem, 2.6vw, 1.65rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .page-head-subtitle {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-top: 4px;
      max-width: 52ch;
    }

    .page-head-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    @media (max-width: 719px) {
      .page-head {
        flex-direction: column;
        align-items: stretch;
        margin-bottom: 16px;
      }
      .page-head-actions > * { width: 100%; }
    }
  `]
})
export class PageHeaderComponent {
  @Input() eyebrow: string | null = '';
  @Input() title: string | null = '';
  @Input() subtitle: string | null = '';
}
