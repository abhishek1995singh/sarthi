import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ThemeService } from '../../../core/theme/theme.service';
import { ThemeId } from '../../../core/theme/themes';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatMenuModule, TranslatePipe
  ],
  template: `
    <div class="login-page">
      <section class="login-visual" aria-hidden="true">
        <div class="visual-glow"></div>
        <div class="visual-content">
          <div class="visual-mark">⚖</div>
          <p class="visual-kicker">{{ 'app.name' | t }}</p>
          <h2 class="visual-title">{{ 'login.visualTitle' | t }}</h2>
          <p class="visual-copy">{{ 'login.visualCopy' | t }}</p>
        </div>
      </section>

      <section class="login-panel">
        <div class="toolbar">
          <button type="button" class="lang-toggle" [matMenuTriggerFor]="themeMenu" [attr.aria-label]="'theme.switch' | t">
            <mat-icon>palette</mat-icon>
            <span class="theme-dots" aria-hidden="true">
              <i *ngFor="let c of theme.current().swatches" [style.background]="c"></i>
            </span>
          </button>
          <mat-menu #themeMenu="matMenu">
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

          <button type="button" class="lang-toggle" (click)="i18n.toggleLocale()" [attr.aria-label]="'lang.switch' | t">
            <mat-icon>translate</mat-icon>
            <span>{{ i18n.locale() === 'hi' ? ('lang.en' | t) : ('lang.hi' | t) }}</span>
          </button>
        </div>

        <div class="login-container">
          <div class="brand mobile-brand">
            <div class="brand-logo"><span>⚖</span></div>
            <h1 class="brand-name">{{ 'app.name' | t }}</h1>
            <p class="brand-tagline">{{ 'app.tagline' | t }}</p>
          </div>

          <div class="login-card">
            <h2 class="login-title">{{ 'login.welcome' | t }}</h2>
            <p class="login-subtitle">{{ 'login.subtitle' | t }}</p>

            <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'login.username' | t }}</mat-label>
                <mat-icon matPrefix>person_outline</mat-icon>
                <input matInput formControlName="username" id="login-username"
                       autocomplete="username">
                <mat-error *ngIf="loginForm.get('username')?.invalid">{{ 'login.usernameRequired' | t }}</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{ 'login.password' | t }}</mat-label>
                <mat-icon matPrefix>lock_outline</mat-icon>
                <input matInput [type]="showPassword ? 'text' : 'password'"
                       formControlName="password" id="login-password"
                       autocomplete="current-password">
                <button mat-icon-button matSuffix type="button"
                        (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">
                  <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('password')?.invalid">{{ 'login.passwordRequired' | t }}</mat-error>
              </mat-form-field>

              <div *ngIf="errorMessage" class="error-alert" role="alert">
                <mat-icon>error_outline</mat-icon>
                {{ errorMessage }}
              </div>

              <button mat-raised-button class="login-btn" type="submit" id="login-submit"
                      [disabled]="loginForm.invalid || loading">
                <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!loading">arrow_forward</mat-icon>
                {{ loading ? ('login.submitting' | t) : ('login.submit' | t) }}
              </button>
            </form>

            <p class="login-hint">{{ 'login.hint' | t }}</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      background: var(--color-bg);
    }

    .login-visual {
      position: relative;
      overflow: hidden;
      padding: clamp(32px, 6vw, 72px);
      display: flex;
      align-items: flex-end;
      background:
        linear-gradient(160deg, #1A2332 0%, #243247 55%, #2C3A52 100%);
      color: #F4F6FA;
    }

    .visual-glow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 70% 50% at 20% 20%, rgba(224, 122, 69, 0.35), transparent 60%),
        radial-gradient(ellipse 50% 40% at 90% 80%, rgba(59, 138, 212, 0.2), transparent 55%);
      pointer-events: none;
    }

    .visual-content {
      position: relative;
      z-index: 1;
      max-width: 420px;
    }

    .visual-mark {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-size: 26px;
      background: linear-gradient(145deg, var(--color-primary-light), var(--color-primary-dark));
      box-shadow: 0 10px 28px rgba(196, 92, 38, 0.35);
      margin-bottom: 20px;
    }

    .visual-kicker {
      font-family: var(--font-heading);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(244, 246, 250, 0.7);
      margin-bottom: 10px;
    }

    .visual-title {
      font-family: var(--font-heading);
      font-size: clamp(1.8rem, 3vw, 2.4rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 12px;
      color: #fff;
    }

    .visual-copy {
      font-size: 14px;
      line-height: 1.6;
      color: rgba(244, 246, 250, 0.78);
      max-width: 36ch;
    }

    .login-panel {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 18px;
    }

    .toolbar {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 2;
    }

    .lang-toggle {
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
    .lang-toggle:hover { border-color: var(--color-primary); color: var(--color-text-primary); }
    .lang-toggle mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .theme-dots { display: inline-flex; gap: 3px; }
    .theme-dots i {
      width: 8px; height: 8px; border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.12); display: inline-block;
    }

    .login-container {
      width: 100%;
      max-width: 420px;
    }

    .mobile-brand {
      display: none;
      text-align: center;
      margin-bottom: 20px;
    }

    .brand-logo {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: linear-gradient(145deg, var(--color-primary-light), var(--color-primary-dark));
      display: grid;
      place-items: center;
      font-size: 24px;
      margin: 0 auto 12px;
      box-shadow: 0 8px 20px rgba(196, 92, 38, 0.25);
    }

    .brand-name {
      font-family: var(--font-heading);
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0;
      color: var(--color-text-primary);
    }

    .brand-tagline {
      color: var(--color-text-secondary);
      font-size: 13px;
      margin-top: 4px;
    }

    .login-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: clamp(20px, 4vw, 32px);
      box-shadow: var(--shadow-md);
    }

    .login-title {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }

    .login-subtitle {
      color: var(--color-text-secondary);
      font-size: 13px;
      margin-bottom: 24px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.22);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      color: var(--color-danger);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .login-btn {
      width: 100%;
      min-height: 48px;
      margin-top: 8px;
      background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary-dark)) !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      border-radius: 10px !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 8px 20px rgba(196, 92, 38, 0.28);
    }

    .login-btn:hover:not([disabled]) {
      box-shadow: 0 10px 24px rgba(196, 92, 38, 0.34);
    }

    .login-hint {
      text-align: center;
      margin-top: 16px;
      color: var(--color-text-muted);
      font-size: 12px;
    }

    @media (max-width: 900px) {
      .login-page {
        grid-template-columns: 1fr;
      }

      .login-visual { display: none; }
      .mobile-brand { display: block; }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public i18n: I18nService,
    public theme: ThemeService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  setTheme(id: ThemeId) {
    this.theme.setTheme(id);
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.status === 401
          ? this.i18n.t('login.error.invalid')
          : this.i18n.t('login.error.failed');
      }
    });
  }
}
