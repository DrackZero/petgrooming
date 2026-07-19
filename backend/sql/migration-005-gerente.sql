-- ============================================================
--  Migración 005 · Rol GERENTE de clínica + suscripción por plan
--  El gerente dirige su veterinaria (NO atiende mascotas: eso es
--  del veterinario). Cada clínica tiene un estado de suscripción
--  y un plan; la plataforma activa/suspende y asigna el plan.
--  Segura de ejecutar varias veces.
-- ============================================================

-- Nuevo rol. (ADD VALUE IF NOT EXISTS requiere PostgreSQL 12+.)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gerente';

-- Estado de suscripción, plan y gerente responsable de la clínica.
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pendiente'; -- pendiente|activa|suspendida
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'basico';      -- basico|pro
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Las clínicas que ya existían están operando: activas y en plan Pro.
UPDATE clinics SET status = 'activa' WHERE status = 'pendiente';
UPDATE clinics SET plan = 'pro' WHERE plan = 'basico';
