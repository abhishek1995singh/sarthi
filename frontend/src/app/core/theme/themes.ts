export type ThemeId =
  | 'harvest'
  | 'forest'
  | 'ocean'
  | 'slate'
  | 'clay'
  | 'midnight';

export interface ThemeOption {
  id: ThemeId;
  labelKey: string;
  /** Swatch colors shown in the picker (primary, accent, bg) */
  swatches: [string, string, string];
  /** Browser chrome / PWA theme-color */
  themeColor: string;
}

/** Curated themes for mandi desk UX — high outdoor readability, distinct from one another. */
export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'harvest',
    labelKey: 'theme.harvest',
    swatches: ['#C45C26', '#1F6FBF', '#EEF1F6'],
    themeColor: '#C45C26'
  },
  {
    id: 'forest',
    labelKey: 'theme.forest',
    swatches: ['#2F6B3A', '#C4782A', '#F0F4F0'],
    themeColor: '#2F6B3A'
  },
  {
    id: 'ocean',
    labelKey: 'theme.ocean',
    swatches: ['#0E7490', '#0F766E', '#ECF5F8'],
    themeColor: '#0E7490'
  },
  {
    id: 'slate',
    labelKey: 'theme.slate',
    swatches: ['#334155', '#2563EB', '#F1F5F9'],
    themeColor: '#334155'
  },
  {
    id: 'clay',
    labelKey: 'theme.clay',
    swatches: ['#8B5E3C', '#3F6F8C', '#F3EFEA'],
    themeColor: '#8B5E3C'
  },
  {
    id: 'midnight',
    labelKey: 'theme.midnight',
    swatches: ['#F0A05A', '#5B9BD5', '#121820'],
    themeColor: '#121820'
  }
];

export const DEFAULT_THEME: ThemeId = 'harvest';
