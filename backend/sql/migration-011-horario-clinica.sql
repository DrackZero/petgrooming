-- ============================================================
--  Migración 011 · Horario de atención por clínica
--  Cada veterinaria define su hora de apertura y cierre. Los
--  veterinarios solo pueden abrir franjas dentro de ese rango,
--  evitando horarios imposibles (madrugada). Segura de ejecutar
--  varias veces.
-- ============================================================

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS opens_at  TIME NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS closes_at TIME NOT NULL DEFAULT '19:00';

-- La apertura debe ser anterior al cierre (no se contemplan turnos
-- que cruzan la medianoche).
ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_horario_valido;
ALTER TABLE clinics ADD CONSTRAINT clinics_horario_valido CHECK (opens_at < closes_at);
