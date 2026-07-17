-- ============================================================
--  Migración 002 · Solicitudes de veterinario + horarios por vet
--  Segura de ejecutar varias veces (IF NOT EXISTS).
-- ============================================================

-- El usuario puede solicitar el rol de veterinario al registrarse;
-- el administrador aprueba o rechaza la solicitud.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vet_requested BOOLEAN NOT NULL DEFAULT false;

-- Cada horario de atención pertenece a un veterinario concreto,
-- para que el cliente pueda elegir con quién agendar.
ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS vet_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_slots_vet ON availability_slots(vet_id);

-- Horarios antiguos sin dueño: asignarlos al primer veterinario.
UPDATE availability_slots
SET vet_id = (SELECT id FROM users WHERE role = 'veterinario' ORDER BY id LIMIT 1)
WHERE vet_id IS NULL;
