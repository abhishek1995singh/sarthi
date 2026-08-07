import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeId } from '../../core/theme/themes';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  sectionKey: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule, MatMenuModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="shell"
         [class.collapsed]="sidebarCollapsed && !isMobile"
         [class.mobile-open]="mobileNavOpen">

      <div class="sidebar-backdrop" *ngIf="isMobile && mobileNavOpen" (click)="closeMobileNav()"></div>

      <aside class="sidebar" [attr.aria-hidden]="isMobile && !mobileNavOpen">
        <div class="sidebar-brand">
          <div class="brand-logo-sm" aria-hidden="true">⚖</div>
          <div class="brand-copy">
            <span class="brand-text">{{ 'app.name' | t }}</span>
            <span class="brand-sub">{{ 'app.tagline' | t }}</span>
          </div>
          <button class="collapse-btn desktop-only" type="button"
                  (click)="sidebarCollapsed = !sidebarCollapsed"
                  [attr.aria-label]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
            <mat-icon>{{ sidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
          <button class="collapse-btn mobile-only" type="button" (click)="closeMobileNav()" [attr.aria-label]="'action.close' | t">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <nav class="sidebar-nav" aria-label="Main">
          <div class="nav-section" *ngFor="let sectionKey of sectionKeys">
            <span class="nav-section-label">{{ sectionKey | t }}</span>
            <ng-container *ngFor="let item of getItemsBySection(sectionKey)">
              <a class="nav-item" [routerLink]="item.path" routerLinkActive="active"
                 (click)="onNavClick()"
                 [matTooltip]="!isMobile && sidebarCollapsed ? (item.labelKey | t) : ''"
                 matTooltipPosition="right">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.labelKey | t }}</span>
              </a>
            </ng-container>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info" [matMenuTriggerFor]="userMenu">
            <div class="user-avatar">{{ userInitial }}</div>
            <div class="user-details">
              <span class="user-name">{{ currentUser?.fullName }}</span>
              <span class="user-role badge badge-info">{{ currentUser?.role }}</span>
            </div>
            <mat-icon class="user-chevron">expand_more</mat-icon>
          </div>
        </div>

        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>{{ 'action.signOut' | t }}</span>
          </button>
        </mat-menu>
      </aside>

      <div class="main-area">
        <header class="topbar">
          <div class="topbar-left">
            <button mat-icon-button type="button" class="menu-btn" (click)="toggleNav()" aria-label="Open menu">
              <mat-icon>menu</mat-icon>
            </button>
            <div class="topbar-brand mobile-only">
              <span class="topbar-title">{{ 'app.name' | t }}</span>
            </div>
          </div>
          <div class="topbar-right">
            <button type="button" class="lang-chip" [matMenuTriggerFor]="themeMenu" [attr.aria-label]="'theme.switch' | t">
              <mat-icon>palette</mat-icon>
              <span class="chip-label">{{ theme.current().labelKey | t }}</span>
              <span class="theme-dots" aria-hidden="true">
                <i *ngFor="let c of theme.current().swatches" [style.background]="c"></i>
              </span>
            </button>
            <mat-menu #themeMenu="matMenu" class="theme-menu-panel">
              <div class="theme-menu" (click)="$event.stopPropagation()">
                <div class="theme-menu-title">{{ 'theme.switch' | t }}</div>
                <button type="button" class="theme-option"
                        *ngFor="let opt of theme.options"
                        [class.active]="theme.themeId() === opt.id"
                        (click)="setTheme(opt.id)">
                  <span class="theme-swatches">
                    <i *ngFor="let c of opt.swatches" [style.background]="c"></i>
                  </span>
                  <span class="theme-name">{{ opt.labelKey | t }}</span>
                  <mat-icon *ngIf="theme.themeId() === opt.id" class="check">check</mat-icon>
                </button>
              </div>
            </mat-menu>

            <button type="button" class="lang-chip" [matMenuTriggerFor]="langMenu" [attr.aria-label]="'lang.switch' | t">
              <mat-icon>translate</mat-icon>
              <span class="chip-label">{{ i18n.locale() === 'hi' ? ('lang.hi' | t) : ('lang.en' | t) }}</span>
            </button>
            <mat-menu #langMenu="matMenu">
              <button mat-menu-item (click)="i18n.setLocale('en')">
                <span>{{ 'lang.en' | t }}</span>
              </button>
              <button mat-menu-item (click)="i18n.setLocale('hi')">
                <span>{{ 'lang.hi' | t }}</span>
              </button>
            </mat-menu>

            <div class="date-chip">
              <mat-icon>calendar_today</mat-icon>
              <span class="date-full">{{ today | date: 'dd MMM yyyy' }}</span>
              <span class="date-short">{{ today | date: 'dd MMM' }}</span>
            </div>
          </div>
        </header>

        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; overflow: hidden; }

    .shell {
      display: flex;
      height: 100dvh;
      background: transparent;
    }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(26, 35, 50, 0.4);
      backdrop-filter: blur(2px);
      z-index: 190;
    }

    .sidebar {
      width: var(--sidebar-width);
      background: var(--sidebar-tint, var(--color-surface));
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      transition: width 0.22s ease, transform 0.22s ease;
      overflow: hidden;
      flex-shrink: 0;
      z-index: 200;
      box-shadow: none;
    }

    .shell.collapsed .sidebar { width: var(--sidebar-collapsed); }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      border-bottom: 1px solid var(--color-border-subtle);
      height: var(--topbar-height);
      min-height: var(--topbar-height);
    }

    .brand-logo-sm {
      width: 36px;
      height: 36px;
      background: linear-gradient(145deg, var(--color-primary-light), var(--color-primary-dark));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      box-shadow: 0 6px 14px rgba(196, 92, 38, 0.28);
    }

    .brand-copy {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .brand-text {
      font-family: var(--font-heading);
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--color-text-primary);
      white-space: nowrap;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      font-size: 10px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    .shell.collapsed .brand-copy,
    .shell.collapsed .brand-sub { opacity: 0; width: 0; }

    .collapse-btn {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      min-width: 36px;
      min-height: 36px;
      justify-content: center;
    }
    .collapse-btn:hover { color: var(--color-text-primary); background: var(--color-surface-raised); }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 12px 10px;
    }

    .nav-section { margin-bottom: 14px; }

    .nav-section-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      padding: 4px 10px 8px;
      white-space: nowrap;
      overflow: hidden;
    }

    .shell.collapsed .nav-section-label { opacity: 0; height: 0; padding: 0; margin: 0; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 12px;
      margin-bottom: 2px;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-radius: 10px;
      transition: background 0.15s ease, color 0.15s ease;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
    }

    .nav-item:hover {
      color: var(--color-text-primary);
      background: var(--color-surface-raised);
      text-decoration: none;
    }

    .nav-item.active {
      color: var(--color-primary-dark);
      background: var(--color-primary-soft);
      font-weight: 600;
    }

    .nav-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-label {
      font-size: 13px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-footer {
      border-top: 1px solid var(--color-border-subtle);
      padding: 10px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
      overflow: hidden;
      min-height: 48px;
    }
    .user-info:hover { background: var(--color-surface-raised); }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(145deg, var(--color-primary), var(--color-accent));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      flex-shrink: 0;
    }

    .user-details {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role { font-size: 9px; padding: 1px 6px; width: fit-content; }

    .user-chevron {
      color: var(--color-text-muted);
      font-size: 18px !important;
      flex-shrink: 0;
    }

    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .topbar {
      height: var(--topbar-height);
      min-height: var(--topbar-height);
      background: var(--topbar-tint, rgba(255, 255, 255, 0.86));
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      flex-shrink: 0;
      gap: 12px;
    }

    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .menu-btn {
      color: var(--color-text-primary);
    }

    .topbar-title {
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
    }

    .date-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .date-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .date-short { display: none; }

    .lang-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-family: inherit;
    }
    .lang-chip:hover { border-color: var(--color-primary); color: var(--color-text-primary); }
    .lang-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .theme-dots {
      display: inline-flex;
      gap: 3px;
      margin-left: 2px;
    }
    .theme-dots i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.12);
      display: inline-block;
    }
    .theme-menu {
      min-width: 220px;
      padding: 8px;
    }
    .theme-menu-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      padding: 6px 8px 10px;
    }
    .theme-option {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      color: var(--color-text-primary);
      text-align: left;
    }
    .theme-option:hover { background: var(--color-surface-raised); }
    .theme-option.active {
      background: var(--color-primary-soft);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
    .theme-swatches {
      display: inline-flex;
      gap: 3px;
      flex-shrink: 0;
    }
    .theme-swatches i {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.12);
      display: inline-block;
    }
    .theme-name { flex: 1; font-size: 13px; font-weight: 600; }
    .theme-option .check { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }

    .page-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      -webkit-overflow-scrolling: touch;
    }

    .mobile-only { display: none; }
    .desktop-only { display: flex; }

    @media (max-width: 960px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: min(86vw, 300px);
        transform: translateX(-105%);
        box-shadow: var(--shadow-lg);
      }

      .shell.mobile-open .sidebar {
        transform: translateX(0);
      }

      .shell.collapsed .sidebar { width: min(86vw, 300px); }
      .shell.collapsed .brand-copy { opacity: 1; width: auto; }

      .menu-btn { display: inline-flex; }
      .mobile-only { display: flex; }
      .desktop-only { display: none !important; }

      .page-content {
        padding: 16px 14px 28px;
      }

      .topbar { padding: 0 12px; }

      .date-full { display: none; }
      .date-short { display: inline; }
      .chip-label { display: none; }
    }

    @media (min-width: 961px) {
      .menu-btn { display: none; }
    }
  `]
})
export class ShellComponent implements OnInit {
  sidebarCollapsed = false;
  mobileNavOpen = false;
  isMobile = false;
  today = new Date();

  navItems: NavItem[] = [
    { path: '/dashboard',           icon: 'dashboard',      labelKey: 'nav.dashboard',     sectionKey: 'nav.overview' },
    { path: '/purchase',            icon: 'shopping_bag',   labelKey: 'nav.purchase',      sectionKey: 'nav.transactions' },
    { path: '/sale',                icon: 'sell',           labelKey: 'nav.sale',          sectionKey: 'nav.transactions' },
    { path: '/cashbook',            icon: 'account_balance_wallet', labelKey: 'nav.cashbook',  sectionKey: 'nav.transactions' },
    { path: '/ledger',              icon: 'menu_book',      labelKey: 'nav.ledger',        sectionKey: 'nav.transactions' },
    { path: '/bardana',             icon: 'inventory_2',    labelKey: 'nav.bardana',       sectionKey: 'nav.transactions' },
    { path: '/masters/parties',     icon: 'people',         labelKey: 'nav.parties',  sectionKey: 'nav.masters' },
    { path: '/masters/commodities', icon: 'grain',          labelKey: 'nav.commodities',   sectionKey: 'nav.masters' },
    { path: '/reports',             icon: 'assessment',     labelKey: 'nav.reportsPage',       sectionKey: 'nav.reports' },
  ];

  sectionKeys = ['nav.overview', 'nav.transactions', 'nav.masters', 'nav.reports'];

  constructor(
    public authService: AuthService,
    public i18n: I18nService,
    public theme: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkViewport();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.closeMobileNav();
    });
  }

  setTheme(id: ThemeId) {
    this.theme.setTheme(id);
  }

  @HostListener('window:resize')
  onResize() {
    this.checkViewport();
  }

  private checkViewport() {
    this.isMobile = window.innerWidth <= 960;
    if (!this.isMobile) {
      this.mobileNavOpen = false;
    }
  }

  toggleNav() {
    if (this.isMobile) {
      this.mobileNavOpen = !this.mobileNavOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
  }

  onNavClick() {
    if (this.isMobile) {
      this.closeMobileNav();
    }
  }

  get currentUser() { return this.authService.currentUser; }

  get userInitial(): string {
    return this.currentUser?.fullName?.charAt(0)?.toUpperCase() ?? 'U';
  }

  getItemsBySection(sectionKey: string): NavItem[] {
    return this.navItems.filter(i => i.sectionKey === sectionKey);
  }

  logout() { this.authService.logout(); }
}
