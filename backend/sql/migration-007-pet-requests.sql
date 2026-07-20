-- ============================================================
--  Migración 007 · Límite de mascotas por cliente + solicitudes
--  El cliente puede registrar su PRIMERA mascota él mismo. Para
--  una adicional debe enviar una solicitud que aprueba/rechaza
--  cualquier veterinario. Segura de ejecutar varias veces.
-- ============================================================

CREATE TABLE IF NOT EXISTS pet_requests (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(80)  NOT NULL,
    species      VARCHAR(40),
    breed        VARCHAR(80),
    age          INTEGER,
    notes        TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pendiente', -- pendiente|aprobada|rechazada
    reviewed_by  INTEGER      REFERENCES users(id),
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_requests_client ON pet_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_pet_requests_status ON pet_requests(status);
