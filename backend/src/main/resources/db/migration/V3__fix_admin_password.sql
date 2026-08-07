-- =============================================================================
-- V3__fix_admin_password.sql
-- Correct admin bcrypt hash for password: Admin@123
-- (V2 seed hash did not match Admin@123)
-- =============================================================================
UPDATE users
SET password = '$2a$12$6jVgwEQwlcj8gSJHHlNvDuw0edYEDyBOBAEHxx4V7FKAGIqFQE18S'
WHERE username = 'admin';
