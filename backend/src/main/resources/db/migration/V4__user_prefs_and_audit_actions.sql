-- User preferences + expanded audit actions

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(5)  NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS preferred_theme  VARCHAR(32) NOT NULL DEFAULT 'harvest';

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log
    ADD CONSTRAINT audit_log_action_check CHECK (action IN (
        'CREATE', 'UPDATE', 'DELETE', 'CONFIRM',
        'LOGIN', 'LOGIN_FAILED', 'LOGOUT',
        'DISABLE', 'ENABLE', 'PASSWORD_RESET'
    ));

CREATE INDEX IF NOT EXISTS idx_audit_changed_by_at ON audit_log(changed_by, changed_at DESC);
