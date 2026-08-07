import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, fallback?: string): string {
    // Depend on locale signal so impure pipe refreshes on language change
    this.i18n.locale();
    return this.i18n.t(key, fallback);
  }
}
