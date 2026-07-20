-- ============================================================
--  Migración 008 · Recuperación de contraseña
--  Tokens de un solo uso, con expiración (1 hora). Se guarda el
--  HASH del token, nunca el token en claro. Segura de ejecutar
--  varias veces.
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash);
