import { Injectable, signal } from '@angular/core';
import { DEFAULT_THEME, THEME_OPTIONS, ThemeId, ThemeOption } from './themes';

const STORAGE_KEY = 'sarthi.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themeId = signal<ThemeId>(this.readInitial());
  readonly options = THEME_OPTIONS;

  constructor() {
    this.apply(this.themeId());
  }

  current(): ThemeOption {
    return THEME_OPTIONS.find(t => t.id === this.themeId()) ?? THEME_OPTIONS[0];
  }

  setTheme(id: ThemeId): void {
    if (!THEME_OPTIONS.some(t => t.id === id)) return;
    this.themeId.set(id);
    localStorage.setItem(STORAGE_KEY, id);
    this.apply(id);
  }

  private apply(id: ThemeId): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', id);
    const meta = document.querySelector('meta[name="theme-color"]');
    const option = THEME_OPTIONS.find(t => t.id === id);
    if (meta && option) {
      meta.setAttribute('content', option.themeColor);
    }
  }

  private readInitial(): ThemeId {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && THEME_OPTIONS.some(t => t.id === saved)) {
      return saved;
    }
    return DEFAULT_THEME;
  }
}
