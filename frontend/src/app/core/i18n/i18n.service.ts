import { Injectable, signal } from '@angular/core';
import { LocaleCode, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'sarthi.locale';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<LocaleCode>(this.readInitial());

  t(key: string, fallback?: string): string {
    const table = TRANSLATIONS[this.locale()];
    return table[key] ?? TRANSLATIONS.en[key] ?? fallback ?? key;
  }

  setLocale(locale: LocaleCode): void {
    this.locale.set(locale);
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'hi' ? 'hi' : 'en';
  }

  toggleLocale(): void {
    this.setLocale(this.locale() === 'en' ? 'hi' : 'en');
  }

  private readInitial(): LocaleCode {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'hi' || saved === 'en') {
      document.documentElement.lang = saved === 'hi' ? 'hi' : 'en';
      return saved;
    }
    document.documentElement.lang = 'en';
    return 'en';
  }
}
