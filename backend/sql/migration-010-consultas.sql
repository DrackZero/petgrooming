-- ============================================================
--  Migración 010 · Consultas clínicas estructuradas
--  El historial deja de ser una nota libre por cita: cada
--  atención queda con motivo, síntomas, diagnóstico, tratamiento
--  y medicamentos en campos separados. Segura de ejecutar
--  varias veces.
-- ============================================================

CREATE TABLE IF NOT EXISTS consultations (
    id             SERIAL PRIMARY KEY,
    pet_id         INTEGER      NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vet_id         INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    appointment_id INTEGER      REFERENCES appointments(id) ON DELETE SET NULL,
    reason         VARCHAR(200) NOT NULL,  -- motivo de consulta
    symptoms       TEXT,                   -- síntomas observados
    diagnosis      TEXT,                   -- diagnóstico
    treatment      TEXT,                   -- tratamiento indicado
    medications    TEXT,                   -- medicamentos recetados
    consulted_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_pet ON consultations(pet_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consulted_at);
