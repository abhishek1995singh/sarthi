import { Component, Input } from '@angular/core';

/**
 * Sarthi's mark — a grain ear on a stem. Replaces the placeholder ⚖ emoji
 * that was previously used as the app logo in the sidebar and on login.
 * Uses `currentColor` so it can sit on any background (set `color` on the host).
 */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M12 20.5V8.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 8.6c-1.7-1.3-3.9-1.2-5.1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M12 8.6c1.7-1.3 3.9-1.2 5.1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M12 12.4c-1.7-1.3-3.9-1.2-5.1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M12 12.4c1.7-1.3 3.9-1.2 5.1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M12 16.2c-1.7-1.3-3.9-1.2-5.1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M12 16.2c1.7-1.3 3.9-1.2 5.1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="12" cy="5.8" r="1.9" fill="currentColor"/>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
  `]
})
export class BrandMarkComponent {
  @Input() size = 22;
}
