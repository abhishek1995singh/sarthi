import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Consistent "nothing here yet" treatment — icon + message + optional
 * projected CTA — instead of every screen writing its own empty <div>.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="empty-state">
      <span class="empty-icon"><mat-icon>{{ icon }}</mat-icon></span>
      <p class="empty-message">{{ message }}</p>
      <div class="empty-action"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 36px 20px;
      color: var(--color-text-muted);
    }

    .empty-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
    }
    .empty-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }

    .empty-message {
      font-size: 13px;
      font-weight: 500;
      max-width: 32ch;
    }

    .empty-action:empty { display: none; }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() message = '';
}
