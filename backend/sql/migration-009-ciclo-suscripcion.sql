-- ============================================================
--  Migración 009 · Ciclo de vida de la suscripción
--  La suscripción deja de ser un pago único que activa para
--  siempre: ahora cada pago cubre un periodo de 30 días y la
--  clínica se suspende sola al vencer. Segura de ejecutar
--  varias veces.
-- ============================================================

-- Vigencia de la suscripción. NULL = la clínica nunca ha pagado.
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clinics_expires ON clinics(subscription_expires_at);

-- Historial real de pagos de suscripción (de aquí sale el ingreso
-- efectivamente recaudado, distinto del proyectado).
CREATE TABLE IF NOT EXISTS subscription_payments (
    id            SERIAL PRIMARY KEY,
    clinic_id     INTEGER       NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    plan          VARCHAR(20)   NOT NULL,
    amount        NUMERIC(10,2) NOT NULL,
    provider      VARCHAR(20)   NOT NULL DEFAULT 'wompi', -- wompi|mock
    reference     VARCHAR(120),
    period_start  TIMESTAMPTZ   NOT NULL,
    period_end    TIMESTAMPTZ   NOT NULL,
    paid_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_clinic ON subscription_payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_paid   ON subscription_payments(paid_at);

-- Las clínicas que ya estaban activas antes de esta migración
-- reciben 30 días de vigencia desde ahora (no se les corta el
-- servicio por un cobro que no existía cuando pagaron).
UPDATE clinics
SET subscription_expires_at = now() + interval '30 days'
WHERE status = 'activa' AND subscription_expires_at IS NULL;
