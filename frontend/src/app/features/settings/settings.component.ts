import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeId } from '../../core/theme/themes';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuditLogEntry, UserAccount } from '../../core/models/models';
import { LocaleCode } from '../../core/i18n/translations';

type SettingsTab = 'preferences' | 'users' | 'audit';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatSnackBarModule, TranslatePipe
  ],
  template: `
    <div class="settings-page" [class.has-fab]="tab === 'users' && isOwner">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'settings.title' | t }}</h1>
          <p class="page-subtitle desktop-only">{{ 'settings.subtitle' | t }}</p>
          <p class="page-subtitle mobile-only">{{ 'settings.subtitleShort' | t }}</p>
        </div>
      </header>

      <!-- Sticky segmented tabs -->
      <nav class="tab-bar" role="tablist" aria-label="Settings">
        <button type="button" role="tab" class="tab"
                [class.active]="tab === 'preferences'"
                [attr.aria-selected]="tab === 'preferences'"
                (click)="tab = 'preferences'">
          <mat-icon>tune</mat-icon>
          <span>{{ 'settings.tab.preferences' | t }}</span>
        </button>
        <button type="button" role="tab" class="tab" *ngIf="isOwner"
                [class.active]="tab === 'users'"
                [attr.aria-selected]="tab === 'users'"
                (click)="openUsers()">
          <mat-icon>group</mat-icon>
          <span>{{ 'settings.tab.users' | t }}</span>
        </button>
        <button type="button" role="tab" class="tab" *ngIf="isOwner"
                [class.active]="tab === 'audit'"
                [attr.aria-selected]="tab === 'audit'"
                (click)="openAudit()">
          <mat-icon>history</mat-icon>
          <span>{{ 'settings.tab.audit' | t }}</span>
        </button>
      </nav>

      <!-- Preferences -->
      <section class="prefs" *ngIf="tab === 'preferences'">
        <div class="pref-block card">
          <div class="block-head">
            <mat-icon>translate</mat-icon>
            <div>
              <h2>{{ 'settings.language' | t }}</h2>
              <p>{{ 'settings.languageHint' | t }}</p>
            </div>
          </div>
          <div class="seg" role="radiogroup" aria-label="Language">
            <button type="button" class="seg-btn" role="radio"
                    [attr.aria-checked]="i18n.locale() === 'en'"
                    [class.active]="i18n.locale() === 'en'"
                    (click)="setLocale('en')">English</button>
            <button type="button" class="seg-btn" role="radio"
                    [attr.aria-checked]="i18n.locale() === 'hi'"
                    [class.active]="i18n.locale() === 'hi'"
                    (click)="setLocale('hi')">हिन्दी</button>
          </div>
        </div>

        <div class="pref-block card">
          <div class="block-head">
            <mat-icon>palette</mat-icon>
            <div>
              <h2>{{ 'settings.theme' | t }}</h2>
              <p>{{ 'settings.themeHint' | t }}</p>
            </div>
          </div>
          <div class="theme-grid">
            <button type="button" class="theme-card"
                    *ngFor="let opt of theme.options"
                    [class.active]="theme.themeId() === opt.id"
                    (click)="setTheme(opt.id)">
              <span class="preview" [attr.data-theme-preview]="opt.id">
                <i *ngFor="let c of opt.swatches" [style.background]="c"></i>
              </span>
              <span class="theme-label">{{ opt.labelKey | t }}</span>
              <mat-icon class="check" *ngIf="theme.themeId() === opt.id">check_circle</mat-icon>
            </button>
          </div>
        </div>

        <div class="save-toast" *ngIf="prefSaving || prefSaved || prefError"
             [class.ok]="prefSaved && !prefSaving" [class.err]="!!prefError">
          <mat-icon>{{ prefError ? 'error' : (prefSaving ? 'sync' : 'check_circle') }}</mat-icon>
          <span *ngIf="prefSaving">{{ 'settings.saving' | t }}</span>
          <span *ngIf="prefSaved && !prefSaving">{{ 'settings.saved' | t }}</span>
          <span *ngIf="prefError">{{ prefError }}</span>
        </div>
      </section>

      <!-- Users -->
      <section class="users-section" *ngIf="tab === 'users' && isOwner">
        <div class="result-meta" *ngIf="!usersLoading">
          <span>{{ users.length }} {{ 'settings.users.count' | t }}</span>
          <button type="button" class="btn btn-primary desktop-add" (click)="openAddUser()">
            <mat-icon>person_add</mat-icon>
            {{ 'settings.users.add' | t }}
          </button>
        </div>

        <div class="loading-state card" *ngIf="usersLoading">
          <mat-spinner diameter="28"></mat-spinner>
          <span>{{ 'settings.loading' | t }}</span>
        </div>

        <div class="mobile-list" *ngIf="!usersLoading && users.length">
          <article class="user-card card" *ngFor="let u of users" [class.inactive]="!u.active">
            <div class="card-top">
              <div class="avatar" [class.owner]="u.role === 'OWNER'">{{ initials(u.fullName) }}</div>
              <div class="card-main">
                <div class="name-row">
                  <h3>{{ u.fullName }}</h3>
                  <span class="role-badge" [attr.data-role]="u.role">{{ u.role }}</span>
                </div>
                <p class="meta">{{ '@' + u.username }}</p>
                <span class="status" [class.off]="!u.active">
                  {{ u.active ? ('settings.users.active' | t) : ('settings.users.disabled' | t) }}
                </span>
              </div>
            </div>
            <div class="card-actions">
              <button type="button" class="action-btn" (click)="openReset(u)">
                <mat-icon>lock_reset</mat-icon>
                <span>{{ 'settings.users.resetPassword' | t }}</span>
              </button>
              <button type="button" class="action-btn danger" *ngIf="u.active"
                      (click)="confirmDisable(u)" [disabled]="u.id === meId">
                <mat-icon>person_off</mat-icon>
                <span>{{ 'settings.users.disable' | t }}</span>
              </button>
              <button type="button" class="action-btn primary" *ngIf="!u.active" (click)="enableUser(u)">
                <mat-icon>person</mat-icon>
                <span>{{ 'settings.users.enable' | t }}</span>
              </button>
            </div>
          </article>
        </div>

        <div class="empty-state card" *ngIf="!usersLoading && !users.length">
          <mat-icon>group_add</mat-icon>
          <h2>{{ 'settings.users.empty' | t }}</h2>
          <p>{{ 'settings.users.emptyHint' | t }}</p>
          <button type="button" class="btn btn-primary" (click)="openAddUser()">
            <mat-icon>person_add</mat-icon>
            {{ 'settings.users.add' | t }}
          </button>
        </div>

        <button type="button" class="fab" (click)="openAddUser()" aria-label="Add user">
          <mat-icon>person_add</mat-icon>
        </button>
      </section>

      <!-- Audit -->
      <section class="audit-section" *ngIf="tab === 'audit' && isOwner">
        <div class="filter-card card">
          <button type="button" class="filter-toggle" (click)="filtersOpen = !filtersOpen">
            <mat-icon>filter_list</mat-icon>
            <span>{{ 'settings.audit.filters' | t }}</span>
            <mat-icon class="chev">{{ filtersOpen ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>

          <div class="filter-body" [class.open]="filtersOpen">
            <div class="filter-grid">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'reports.from' | t }}</mat-label>
                <input matInput type="date" [(ngModel)]="auditFrom">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'reports.to' | t }}</mat-label>
                <input matInput type="date" [(ngModel)]="auditTo">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'settings.audit.entity' | t }}</mat-label>
                <mat-select [(ngModel)]="auditEntity">
                  <mat-option value="">{{ 'filter.all' | t }}</mat-option>
                  <mat-option value="Purchase">Purchase</mat-option>
                  <mat-option value="Sale">Sale</mat-option>
                  <mat-option value="CashBook">CashBook</mat-option>
                  <mat-option value="Party">Party</mat-option>
                  <mat-option value="User">User</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'settings.audit.action' | t }}</mat-label>
                <mat-select [(ngModel)]="auditAction">
                  <mat-option value="">{{ 'filter.all' | t }}</mat-option>
                  <mat-option *ngFor="let a of auditActions" [value]="a">{{ a }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>
        </div>

        <div class="loading-state card" *ngIf="auditLoading">
          <mat-spinner diameter="28"></mat-spinner>
          <span>{{ 'settings.loading' | t }}</span>
        </div>

        <div class="mobile-list" *ngIf="!auditLoading && auditRows.length">
          <article class="audit-card card" *ngFor="let row of auditRows"
                   [class.expanded]="expandedAudit === row.id"
                   (click)="toggleAudit(row.id)">
            <div class="audit-row">
              <span class="action-pill" [attr.data-action]="row.action">{{ row.action }}</span>
              <div class="audit-main">
                <strong>{{ row.entityName }} <span class="id">#{{ row.entityId }}</span></strong>
                <span class="who">{{ row.changedByFullName || row.changedByUsername || '—' }}</span>
              </div>
              <div class="when-col">
                <span class="when">{{ row.changedAt | date:'dd MMM' }}</span>
                <span class="time">{{ row.changedAt | date:'HH:mm' }}</span>
              </div>
              <mat-icon class="expand-icon">{{ expandedAudit === row.id ? 'expand_less' : 'expand_more' }}</mat-icon>
            </div>
            <div class="audit-detail" *ngIf="expandedAudit === row.id" (click)="$event.stopPropagation()">
              <p class="ip" *ngIf="row.ipAddress"><mat-icon>lan</mat-icon> {{ row.ipAddress }}</p>
              <pre class="json">{{ formatAudit(row) }}</pre>
            </div>
          </article>
        </div>

        <div class="empty-state card" *ngIf="!auditLoading && !auditRows.length">
          <mat-icon>manage_search</mat-icon>
          <h2>{{ 'settings.audit.empty' | t }}</h2>
        </div>

        <div class="pager" *ngIf="auditTotalPages > 1">
          <button type="button" class="btn btn-ghost" [disabled]="auditPage === 0"
                  (click)="auditPage = auditPage - 1; loadAudit()">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <span>{{ auditPage + 1 }} / {{ auditTotalPages }}</span>
          <button type="button" class="btn btn-ghost" [disabled]="auditPage + 1 >= auditTotalPages"
                  (click)="auditPage = auditPage + 1; loadAudit()">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>

        <div class="sticky-run">
          <button type="button" class="btn btn-primary run-btn" (click)="runAudit()" [disabled]="auditLoading">
            <mat-icon>play_arrow</mat-icon>
            {{ 'reports.run' | t }}
          </button>
        </div>
      </section>

      <!-- Add user sheet -->
      <div class="dialog-overlay" *ngIf="showUserForm" (click)="closeAddUser()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'settings.users.add' | t }}</h3>
            <button mat-icon-button type="button" (click)="closeAddUser()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <form [formGroup]="userForm" (ngSubmit)="createUser()" class="dialog-body">
            <div class="form-section">
              <div class="form-section-title">{{ 'settings.users.basics' | t }}</div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'settings.users.username' | t }}</mat-label>
                <input matInput formControlName="username" autocomplete="off" autocapitalize="off">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'settings.users.fullName' | t }}</mat-label>
                <input matInput formControlName="fullName" autocomplete="name">
              </mat-form-field>
            </div>
            <div class="form-section">
              <div class="form-section-title">{{ 'settings.users.role' | t }}</div>
              <div class="role-seg">
                <button type="button" class="seg-btn" [class.active]="userForm.value.role === 'STAFF'"
                        (click)="userForm.patchValue({ role: 'STAFF' })">STAFF</button>
                <button type="button" class="seg-btn" [class.active]="userForm.value.role === 'OWNER'"
                        (click)="userForm.patchValue({ role: 'OWNER' })">OWNER</button>
              </div>
            </div>
            <div class="form-section">
              <div class="form-section-title">{{ 'settings.users.password' | t }}</div>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'settings.users.password' | t }}</mat-label>
                <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="password" autocomplete="new-password">
                <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd" tabindex="-1">
                  <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <p class="field-hint">{{ 'settings.users.passwordHint' | t }}</p>
            </div>
            <p class="hint err" *ngIf="userError">{{ userError }}</p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeAddUser()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="userForm.invalid || userBusy">
                {{ userBusy ? ('settings.saving' | t) : ('action.save' | t) }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Reset password sheet -->
      <div class="dialog-overlay" *ngIf="resetTarget" (click)="closeReset()">
        <div class="dialog-panel card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'settings.users.resetPassword' | t }}</h3>
            <button mat-icon-button type="button" (click)="closeReset()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <form [formGroup]="resetForm" (ngSubmit)="submitReset()" class="dialog-body">
            <p class="reset-who">{{ resetTarget?.fullName }} · {{ '@' + (resetTarget?.username || '') }}</p>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'settings.users.newPassword' | t }}</mat-label>
              <input matInput [type]="showResetPwd ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showResetPwd = !showResetPwd" tabindex="-1">
                <mat-icon>{{ showResetPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            <p class="hint err" *ngIf="resetError">{{ resetError }}</p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="closeReset()">{{ 'action.cancel' | t }}</button>
              <button type="submit" class="btn btn-primary" [disabled]="resetForm.invalid || resetBusy">
                {{ 'action.save' | t }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Disable confirm -->
      <div class="dialog-overlay" *ngIf="disableTarget" (click)="disableTarget = null">
        <div class="dialog-panel card confirm-sheet" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h3>{{ 'settings.users.disable' | t }}</h3>
            <button mat-icon-button type="button" (click)="disableTarget = null" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="dialog-body">
            <p class="confirm-copy">{{ 'settings.users.disableConfirm' | t }} <strong>{{ disableTarget?.fullName }}</strong>?</p>
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" (click)="disableTarget = null">{{ 'action.cancel' | t }}</button>
              <button type="button" class="btn btn-danger" (click)="disableUser(disableTarget!)">{{ 'settings.users.disable' | t }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      max-width: 920px;
    }
    .settings-page.has-fab { padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
    .page-title { margin: 0; font-size: clamp(1.35rem, 4vw, 1.65rem); font-weight: 800; letter-spacing: -0.03em; }
    .page-subtitle { margin: 4px 0 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.35; }
    .desktop-only { display: none; }
    .mobile-only { display: block; }
    .w-full { width: 100%; }

    /* Tabs */
    .tab-bar {
      position: sticky; top: 0; z-index: 8;
      display: flex; gap: 6px;
      margin: 12px 0 14px;
      padding: 8px 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      background: color-mix(in srgb, var(--color-bg) 88%, transparent);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .tab-bar::-webkit-scrollbar { display: none; }
    .tab {
      flex: 1 0 auto;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      min-height: 42px; padding: 8px 14px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font: inherit; font-size: 13px; font-weight: 700;
      cursor: pointer; white-space: nowrap;
    }
    .tab mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tab.active {
      background: var(--color-primary); color: #fff; border-color: var(--color-primary);
      box-shadow: 0 6px 16px color-mix(in srgb, var(--color-primary) 28%, transparent);
    }

    /* Preferences */
    .prefs { display: flex; flex-direction: column; gap: 12px; }
    .pref-block { padding: 14px 14px 16px; }
    .block-head {
      display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px;
    }
    .block-head > mat-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: grid; place-items: center;
      background: color-mix(in srgb, var(--color-primary) 14%, transparent);
      color: var(--color-primary); font-size: 20px;
    }
    .block-head h2 { margin: 0; font-size: 15px; font-weight: 750; }
    .block-head p { margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted); }

    .seg, .role-seg {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0;
      border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden;
    }
    .seg-btn {
      min-height: 44px; border: 0; background: transparent;
      font: inherit; font-weight: 700; font-size: 14px;
      color: var(--color-text-secondary); cursor: pointer;
    }
    .seg-btn.active { background: var(--color-primary); color: #fff; }

    .theme-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .theme-card {
      position: relative;
      display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
      min-height: 88px; padding: 12px;
      border: 1.5px solid var(--color-border);
      border-radius: 14px;
      background: var(--color-bg);
      font: inherit; text-align: left; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .theme-card.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
    }
    .preview { display: flex; gap: 5px; }
    .preview i {
      width: 18px; height: 18px; border-radius: 50%;
      border: 1px solid rgba(0,0,0,.12); display: block;
    }
    .theme-label { font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
    .theme-card .check {
      position: absolute; top: 10px; right: 10px;
      color: var(--color-primary); font-size: 18px; width: 18px; height: 18px;
    }

    .save-toast {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 12px;
      background: var(--color-surface); border: 1px solid var(--color-border);
      font-size: 13px; font-weight: 650; color: var(--color-text-secondary);
    }
    .save-toast.ok { color: #15803d; border-color: #bbf7d0; background: #f0fdf4; }
    .save-toast.err { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
    .save-toast mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Users */
    .result-meta {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; margin-bottom: 10px; font-size: 12px; font-weight: 650;
      color: var(--color-text-muted);
    }
    .desktop-add { display: none; }
    .mobile-list { display: flex; flex-direction: column; gap: 10px; }
    .user-card { padding: 14px; }
    .user-card.inactive { opacity: 0.78; }
    .card-top { display: flex; gap: 12px; align-items: flex-start; }
    .avatar {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: grid; place-items: center;
      background: var(--color-primary); color: #fff; font-weight: 800; font-size: 16px;
    }
    .avatar.owner {
      background: linear-gradient(145deg, var(--color-primary), var(--color-primary-dark, #9a4518));
    }
    .card-main { min-width: 0; flex: 1; }
    .name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .name-row h3 { margin: 0; font-size: 15px; font-weight: 750; }
    .role-badge {
      font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
      padding: 3px 7px; border-radius: 999px;
      background: color-mix(in srgb, var(--color-primary) 14%, transparent);
      color: var(--color-primary);
    }
    .role-badge[data-role="OWNER"] { background: #fef3c7; color: #92400e; }
    .meta { margin: 3px 0 6px; font-size: 12px; color: var(--color-text-muted); }
    .status {
      display: inline-flex; font-size: 11px; font-weight: 700;
      padding: 3px 8px; border-radius: 999px;
      background: #dcfce7; color: #166534;
    }
    .status.off { background: #fee2e2; color: #991b1b; }
    .card-actions {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid var(--color-border-subtle, var(--color-border));
    }
    .action-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      min-height: 42px; padding: 8px 10px;
      border: 1px solid var(--color-border); border-radius: 10px;
      background: var(--color-bg); color: var(--color-text-primary);
      font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .action-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .action-btn.primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
    .action-btn.danger { color: #b91c1c; }
    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .action-btn:only-child { grid-column: 1 / -1; }

    .fab {
      position: fixed;
      right: max(16px, env(safe-area-inset-right));
      bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      z-index: 20;
      width: 56px; height: 56px; border-radius: 16px; border: 0;
      background: var(--color-primary); color: #fff;
      display: grid; place-items: center;
      box-shadow: 0 10px 28px color-mix(in srgb, var(--color-primary) 40%, transparent);
      cursor: pointer;
    }
    .fab mat-icon { font-size: 26px; width: 26px; height: 26px; }

    /* Audit */
    .audit-section { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)); }
    .filter-card { padding: 0; overflow: hidden; margin-bottom: 12px; }
    .filter-toggle {
      width: 100%; display: flex; align-items: center; gap: 8px;
      min-height: 48px; padding: 0 14px;
      border: 0; background: transparent; font: inherit; font-weight: 700; font-size: 14px;
      color: var(--color-text-primary); cursor: pointer;
    }
    .filter-toggle .chev { margin-left: auto; color: var(--color-text-muted); }
    .filter-body { display: none; padding: 0 14px 14px; border-top: 1px solid var(--color-border-subtle, var(--color-border)); }
    .filter-body.open { display: block; padding-top: 12px; }
    .filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; }

    .audit-card { padding: 12px 12px 12px 14px; cursor: pointer; }
    .audit-row { display: flex; align-items: center; gap: 10px; }
    .action-pill {
      flex-shrink: 0; font-size: 10px; font-weight: 800; letter-spacing: 0.02em;
      padding: 4px 7px; border-radius: 8px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      max-width: 72px; overflow: hidden; text-overflow: ellipsis;
    }
    .action-pill[data-action="CREATE"],
    .action-pill[data-action="LOGIN"],
    .action-pill[data-action="ENABLE"] { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
    .action-pill[data-action="DELETE"],
    .action-pill[data-action="DISABLE"],
    .action-pill[data-action="LOGIN_FAILED"] { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
    .action-pill[data-action="CONFIRM"],
    .action-pill[data-action="UPDATE"] { background: #dbeafe; border-color: #bfdbfe; color: #1e40af; }
    .audit-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .audit-main strong { font-size: 13px; font-weight: 750; }
    .audit-main .id { color: var(--color-text-muted); font-weight: 600; }
    .who { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .when-col { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .when { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); }
    .time { font-size: 10px; color: var(--color-text-muted); }
    .expand-icon { color: var(--color-text-muted); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .audit-detail { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--color-border-subtle, var(--color-border)); }
    .ip { display: flex; align-items: center; gap: 4px; margin: 0 0 8px; font-size: 11px; color: var(--color-text-muted); }
    .ip mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .json {
      margin: 0; padding: 10px; border-radius: 10px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      font-size: 11px; overflow: auto; max-height: 160px; white-space: pre-wrap; word-break: break-word;
    }

    .sticky-run {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 15;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
      background: color-mix(in srgb, var(--color-bg) 88%, transparent);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid var(--color-border-subtle, var(--color-border));
    }
    .run-btn {
      width: 100%; min-height: 48px; justify-content: center;
      border-radius: 12px; font-size: 15px; font-weight: 750;
    }

    .pager {
      display: flex; align-items: center; justify-content: center; gap: 14px;
      margin: 14px 0 8px; font-size: 13px; font-weight: 700;
    }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 36px 20px; text-align: center;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--color-text-muted); }
    .empty-state h2 { margin: 0; font-size: 16px; font-weight: 750; }
    .empty-state p { margin: 0; font-size: 13px; color: var(--color-text-muted); }

    .hint.err { color: #b91c1c; font-size: 12px; margin: 0 0 8px; }
    .field-hint { margin: -4px 0 8px; font-size: 11px; color: var(--color-text-muted); }
    .reset-who { margin: 0 0 12px; font-size: 13px; color: var(--color-text-secondary); }
    .confirm-copy { margin: 0 0 8px; font-size: 14px; line-height: 1.45; }
    .btn-danger {
      background: #b91c1c; color: #fff; border: 1px solid #b91c1c;
      border-radius: 10px; padding: 10px 14px; font-weight: 700; font: inherit; cursor: pointer;
    }

    @media (min-width: 720px) {
      .desktop-only { display: block; }
      .mobile-only { display: none; }
      .desktop-add { display: inline-flex; }
      .fab { display: none; }
      .theme-grid { grid-template-columns: repeat(3, 1fr); }
      .filter-body { display: block !important; padding: 12px 14px 14px; border-top: 1px solid var(--color-border-subtle, var(--color-border)); }
      .filter-toggle { display: none; }
      .sticky-run {
        position: static; padding: 0; margin-top: 12px;
        background: transparent; border: 0; backdrop-filter: none;
      }
      .run-btn { width: auto; min-width: 140px; }
      .audit-section { padding-bottom: 24px; }
      .tab { flex: 0 0 auto; min-width: 140px; }
    }
  `]
})
export class SettingsComponent implements OnInit {
  tab: SettingsTab = 'preferences';
  prefSaving = false;
  prefSaved = false;
  prefError = '';

  users: UserAccount[] = [];
  usersLoading = false;
  userBusy = false;
  userError = '';
  showUserForm = false;
  showPwd = false;
  userForm: FormGroup;

  resetTarget: UserAccount | null = null;
  resetForm: FormGroup;
  resetBusy = false;
  resetError = '';
  showResetPwd = false;
  disableTarget: UserAccount | null = null;

  auditRows: AuditLogEntry[] = [];
  auditLoading = false;
  auditFrom = '';
  auditTo = '';
  auditEntity = '';
  auditAction = '';
  auditPage = 0;
  auditTotalPages = 0;
  expandedAudit: number | null = null;
  filtersOpen = false;
  auditActions = ['CREATE', 'UPDATE', 'DELETE', 'CONFIRM', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'DISABLE', 'ENABLE', 'PASSWORD_RESET'];

  constructor(
    public auth: AuthService,
    public i18n: I18nService,
    public theme: ThemeService,
    private settings: SettingsService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      fullName: ['', Validators.required],
      role: ['STAFF', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  get isOwner(): boolean {
    return this.auth.isOwner();
  }

  get meId(): number | undefined {
    return this.auth.currentUser?.id;
  }

  initials(name: string): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  setLocale(locale: LocaleCode): void {
    this.i18n.setLocale(locale);
    this.persistPrefs();
  }

  setTheme(id: ThemeId): void {
    this.theme.setTheme(id);
    this.persistPrefs();
  }

  private persistPrefs(): void {
    this.prefSaving = true;
    this.prefSaved = false;
    this.prefError = '';
    this.settings.savePreferences({
      preferredLocale: this.i18n.locale(),
      preferredTheme: this.theme.themeId()
    }).subscribe({
      next: res => {
        this.prefSaving = false;
        this.prefSaved = true;
        this.auth.patchLocalUser({
          preferredLocale: res.data.preferredLocale,
          preferredTheme: res.data.preferredTheme
        });
      },
      error: err => {
        this.prefSaving = false;
        this.prefError = err?.error?.message || 'Failed to save preferences';
      }
    });
  }

  openUsers(): void {
    this.tab = 'users';
    this.loadUsers();
  }

  openAudit(): void {
    this.tab = 'audit';
    this.loadAudit();
  }

  openAddUser(): void {
    this.userError = '';
    this.showPwd = false;
    this.userForm.reset({ role: 'STAFF', username: '', fullName: '', password: '' });
    this.showUserForm = true;
  }

  closeAddUser(): void {
    this.showUserForm = false;
    this.userError = '';
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.settings.listUsers().subscribe({
      next: res => {
        this.users = res.data ?? [];
        this.usersLoading = false;
      },
      error: () => { this.usersLoading = false; }
    });
  }

  createUser(): void {
    if (this.userForm.invalid) return;
    this.userBusy = true;
    this.userError = '';
    this.settings.createUser(this.userForm.getRawValue()).subscribe({
      next: () => {
        this.userBusy = false;
        this.closeAddUser();
        this.snack.open(this.i18n.t('settings.users.created'), undefined, { duration: 2200 });
        this.loadUsers();
      },
      error: err => {
        this.userBusy = false;
        this.userError = err?.error?.message || 'Failed to create user';
      }
    });
  }

  confirmDisable(u: UserAccount): void {
    this.disableTarget = u;
  }

  disableUser(u: UserAccount): void {
    this.settings.disableUser(u.id).subscribe({
      next: () => {
        this.disableTarget = null;
        this.loadUsers();
      },
      error: err => {
        this.disableTarget = null;
        this.snack.open(err?.error?.message || 'Failed', undefined, { duration: 2500 });
      }
    });
  }

  enableUser(u: UserAccount): void {
    this.settings.enableUser(u.id).subscribe({ next: () => this.loadUsers() });
  }

  openReset(u: UserAccount): void {
    this.resetTarget = u;
    this.resetError = '';
    this.showResetPwd = false;
    this.resetForm.reset({ newPassword: '' });
  }

  closeReset(): void {
    this.resetTarget = null;
    this.resetError = '';
  }

  submitReset(): void {
    if (!this.resetTarget || this.resetForm.invalid) return;
    this.resetBusy = true;
    this.resetError = '';
    this.settings.resetPassword(this.resetTarget.id, this.resetForm.value.newPassword).subscribe({
      next: () => {
        this.resetBusy = false;
        this.closeReset();
        this.snack.open(this.i18n.t('settings.users.passwordReset'), undefined, { duration: 2200 });
      },
      error: err => {
        this.resetBusy = false;
        this.resetError = err?.error?.message || 'Reset failed';
      }
    });
  }

  runAudit(): void {
    this.auditPage = 0;
    this.filtersOpen = false;
    this.loadAudit();
  }

  loadAudit(): void {
    this.auditLoading = true;
    this.settings.searchAudit({
      from: this.auditFrom || undefined,
      to: this.auditTo || undefined,
      entity: this.auditEntity || undefined,
      action: this.auditAction || undefined,
      page: this.auditPage,
      size: 40
    }).subscribe({
      next: res => {
        this.auditRows = res.data?.content ?? [];
        this.auditTotalPages = res.data?.totalPages ?? 0;
        this.auditLoading = false;
      },
      error: () => { this.auditLoading = false; }
    });
  }

  toggleAudit(id: number): void {
    this.expandedAudit = this.expandedAudit === id ? null : id;
  }

  formatAudit(row: AuditLogEntry): string {
    return JSON.stringify({ old: row.oldValue, new: row.newValue }, null, 2);
  }
}
