-- ============================================================
--  PetGrooming · Esquema de base de datos (PostgreSQL)
--  13 tablas
-- ============================================================

-- Limpieza opcional (en orden inverso por dependencias)
DROP TABLE IF EXISTS notifications     CASCADE;
DROP TABLE IF EXISTS payments          CASCADE;
DROP TABLE IF EXISTS order_items       CASCADE;
DROP TABLE IF EXISTS orders            CASCADE;
DROP TABLE IF EXISTS products          CASCADE;
DROP TABLE IF EXISTS enrollments       CASCADE;
DROP TABLE IF EXISTS courses           CASCADE;
DROP TABLE IF EXISTS appointments      CASCADE;
DROP TABLE IF EXISTS slots             CASCADE;
DROP TABLE IF EXISTS services          CASCADE;
DROP TABLE IF EXISTS pets              CASCADE;
DROP TABLE IF EXISTS users             CASCADE;
DROP TYPE  IF EXISTS user_role         CASCADE;

-- ─── Tipos ENUM ─────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('client', 'admin');

-- 1) USERS ──────────────────────────────────────────────────
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    phone         VARCHAR(30),
    role          user_role     NOT NULL DEFAULT 'client',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 2) PETS ───────────────────────────────────────────────────
CREATE TABLE pets (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(80)  NOT NULL,
    species     VARCHAR(40)  NOT NULL,          -- perro, gato, etc.
    breed       VARCHAR(80),
    size        VARCHAR(20),                     -- small, medium, large
    birth_date  DATE,
    notes       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3) SERVICES (tipos de servicio de peluquería) ─────────────
CREATE TABLE services (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120)   NOT NULL,
    description     TEXT,
    price           NUMERIC(10,2)  NOT NULL DEFAULT 0,
    duration_min    INTEGER        NOT NULL DEFAULT 60,
    active          BOOLEAN        NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- 4) SLOTS (franjas horarias disponibles) ───────────────────
CREATE TABLE slots (
    id          SERIAL PRIMARY KEY,
    starts_at   TIMESTAMPTZ  NOT NULL,
    ends_at     TIMESTAMPTZ  NOT NULL,
    capacity    INTEGER      NOT NULL DEFAULT 1,
    is_available BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 5) APPOINTMENTS (citas) ───────────────────────────────────
CREATE TABLE appointments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    pet_id      INTEGER      NOT NULL REFERENCES pets(id)     ON DELETE CASCADE,
    service_id  INTEGER      NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    slot_id     INTEGER      NOT NULL REFERENCES slots(id)    ON DELETE RESTRICT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending|confirmed|done|cancelled
    notes       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 6) COURSES (cursos) ───────────────────────────────────────
CREATE TABLE courses (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(160)  NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL DEFAULT 0,
    capacity     INTEGER       NOT NULL DEFAULT 20,
    starts_at    TIMESTAMPTZ,
    image_url    VARCHAR(300),
    active       BOOLEAN       NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 7) ENROLLMENTS (inscripciones a cursos) ───────────────────
CREATE TABLE enrollments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    course_id   INTEGER      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active|cancelled|completed
    enrolled_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

-- 8) PRODUCTS (tienda) ──────────────────────────────────────
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(160)  NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock       INTEGER       NOT NULL DEFAULT 0,
    image_url   VARCHAR(300),
    category    VARCHAR(80),
    active      BOOLEAN       NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 9) ORDERS (pedidos) ───────────────────────────────────────
CREATE TABLE orders (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total        NUMERIC(10,2) NOT NULL DEFAULT 0,
    status       VARCHAR(20)   NOT NULL DEFAULT 'pending', -- pending|paid|shipped|cancelled
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 10) ORDER_ITEMS (líneas de pedido) ────────────────────────
CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER       NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id  INTEGER       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER       NOT NULL DEFAULT 1,
    unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 11) PAYMENTS (pagos) ──────────────────────────────────────
CREATE TABLE payments (
    id            SERIAL PRIMARY KEY,
    order_id      INTEGER       REFERENCES orders(id) ON DELETE SET NULL,
    user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount        NUMERIC(10,2) NOT NULL,
    provider      VARCHAR(40)   NOT NULL DEFAULT 'manual',
    provider_ref  VARCHAR(160),
    status        VARCHAR(20)   NOT NULL DEFAULT 'pending', -- pending|succeeded|failed
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 12) NOTIFICATIONS (avisos al usuario) ─────────────────────
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(160) NOT NULL,
    body        TEXT,
    is_read     BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 13) SETTINGS (configuración del negocio, clave-valor) ──────
CREATE TABLE settings (
    key         VARCHAR(80)  PRIMARY KEY,
    value       TEXT,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── Índices útiles ─────────────────────────────────────────
CREATE INDEX idx_pets_owner          ON pets(owner_id);
CREATE INDEX idx_appointments_user   ON appointments(user_id);
CREATE INDEX idx_appointments_slot   ON appointments(slot_id);
CREATE INDEX idx_enrollments_user    ON enrollments(user_id);
CREATE INDEX idx_orders_user         ON orders(user_id);
CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_notifications_user  ON notifications(user_id);

-- ─── Datos semilla mínimos ──────────────────────────────────
-- Admin por defecto (email: admin@petgrooming.com · password: admin123)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrador', 'admin@petgrooming.com',
        '$2a$10$lb3HMbqtD5evbKK8vjVRJuSklJpNOgta6W70DRbl9ptLxYwEuYZca', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO services (name, description, price, duration_min) VALUES
  ('Baño básico',        'Baño, secado y cepillado',           25.00, 45),
  ('Corte completo',     'Baño + corte de pelo a tijera/máquina', 40.00, 90),
  ('Corte de uñas',      'Corte y limado de uñas',              10.00, 20)
ON CONFLICT DO NOTHING;
