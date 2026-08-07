import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'masters/parties',
        loadComponent: () =>
          import('./features/masters/party/party-list.component').then(m => m.PartyListComponent)
      },
      {
        path: 'masters/commodities',
        loadComponent: () =>
          import('./features/masters/commodity/commodity-list.component').then(m => m.CommodityListComponent)
      },
      {
        path: 'purchase',
        loadComponent: () =>
          import('./features/purchase/purchase-list.component').then(m => m.PurchaseListComponent)
      },
      {
        path: 'sale',
        loadComponent: () =>
          import('./features/sale/sale-list.component').then(m => m.SaleListComponent)
      },
      {
        path: 'cashbook',
        loadComponent: () =>
          import('./features/cashbook/cashbook.component').then(m => m.CashbookComponent)
      },
      {
        path: 'ledger',
        loadComponent: () =>
          import('./features/ledger/ledger.component').then(m => m.LedgerComponent)
      },
      {
        path: 'bardana',
        loadComponent: () =>
          import('./features/bardana/bardana.component').then(m => m.BardanaComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(m => m.ReportsComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
