export const ADMIN_USER = process.env.SARTHI_USER ?? 'admin';
export const ADMIN_PASSWORD = process.env.SARTHI_PASSWORD ?? 'Admin@123';

export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  purchase: '/purchase',
  sale: '/sale',
  cashbook: '/cashbook',
  ledger: '/ledger',
  bardana: '/bardana',
  parties: '/masters/parties',
  commodities: '/masters/commodities',
  reports: '/reports',
  settings: '/settings',
} as const;
