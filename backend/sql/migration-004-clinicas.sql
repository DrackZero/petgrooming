-- ============================================================
--  Migración 004 · Modelo multi-clínica
--  El historial clínico pertenece a la mascota (portable entre
--  clínicas); cada veterinario pertenece a una clínica y todo
--  acceso a historiales queda auditado.
--  Segura de ejecutar varias veces (IF NOT EXISTS).
-- ============================================================

-- Clínicas veterinarias suscritas a la plataforma.
CREATE TABLE IF NOT EXISTS clinics (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(160) NOT NULL,
    address     VARCHAR(255),
    phone       VARCHAR(30),
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Cada veterinario pertenece a una clínica (los clientes no: son de la plataforma).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL;

-- Trazabilidad: qué veterinario registró cada vacuna.
ALTER TABLE vaccines
  ADD COLUMN IF NOT EXISTS vet_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Bitácora de acceso a historiales clínicos (auditoría "break-glass"):
-- no bloquea el acceso de emergencia, lo deja registrado.
CREATE TABLE IF NOT EXISTS emergency_access_log (
    id           SERIAL PRIMARY KEY,
    vet_id       INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id       INTEGER     NOT NULL REFERENCES pets(id)  ON DELETE CASCADE,
    accessed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_clinic   ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_access_log_pet ON emergency_access_log(pet_id);
CREATE INDEX IF NOT EXISTS idx_access_log_vet ON emergency_access_log(vet_id);

-- Clínica inicial y asignación de los veterinarios existentes.
INSERT INTO clinics (name, address)
SELECT 'PetGrooming Yopal', 'Yopal, Casanare'
WHERE NOT EXISTS (SELECT 1 FROM clinics);

UPDATE users
SET clinic_id = (SELECT id FROM clinics ORDER BY id LIMIT 1)
WHERE role = 'veterinario' AND clinic_id IS NULL;
