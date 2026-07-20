-- ============================================================
--  Migración 006 · Tienda y cursos por clínica (plan Pro)
--  Cada producto/curso pertenece a una clínica. El gerente de
--  una clínica Pro puede activar su tienda y gestionar su
--  catálogo. Segura de ejecutar varias veces.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE;

-- Interruptor de la tienda de la clínica (solo aplica a plan Pro).
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_clinic ON products(clinic_id);
CREATE INDEX IF NOT EXISTS idx_courses_clinic  ON courses(clinic_id);

-- Los productos/cursos que ya existían pasan a la clínica semilla,
-- que queda con la tienda activa para no interrumpir la tienda actual.
UPDATE products SET clinic_id = (SELECT id FROM clinics ORDER BY id LIMIT 1) WHERE clinic_id IS NULL;
UPDATE courses  SET clinic_id = (SELECT id FROM clinics ORDER BY id LIMIT 1) WHERE clinic_id IS NULL;
UPDATE clinics SET store_enabled = true WHERE id = (SELECT id FROM clinics ORDER BY id LIMIT 1);
