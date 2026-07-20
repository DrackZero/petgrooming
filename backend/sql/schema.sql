-- ============================================================
--  PetGrooming · Esquema de base de datos (PostgreSQL)
--  13 tablas · 3 roles (cliente, veterinario, admin)
-- ============================================================

-- Limpieza (orden inverso por dependencias)
-- Tablas del esquema anterior (v1), por si existen:
DROP TABLE IF EXISTS services            CASCADE;
DROP TABLE IF EXISTS settings            CASCADE;
DROP TABLE IF EXISTS slots               CASCADE;
DROP TABLE IF EXISTS emergency_access_log CASCADE;
DROP TABLE IF EXISTS messages            CASCADE;
DROP TABLE IF EXISTS conversations       CASCADE;
DROP TABLE IF EXISTS notifications       CASCADE;
DROP TABLE IF EXISTS payments            CASCADE;
DROP TABLE IF EXISTS order_items         CASCADE;
DROP TABLE IF EXISTS orders              CASCADE;
DROP TABLE IF EXISTS products            CASCADE;
DROP TABLE IF EXISTS enrollments         CASCADE;
DROP TABLE IF EXISTS courses             CASCADE;
DROP TABLE IF EXISTS appointments        CASCADE;
DROP TABLE IF EXISTS availability_slots  CASCADE;
DROP TABLE IF EXISTS vaccines            CASCADE;
DROP TABLE IF EXISTS pets                CASCADE;
DROP TABLE IF EXISTS refresh_tokens      CASCADE;
DROP TABLE IF EXISTS users               CASCADE;
DROP TABLE IF EXISTS clinics             CASCADE;
DROP TYPE  IF EXISTS user_role           CASCADE;

-- ─── Tipos ENUM ─────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('cliente', 'veterinario', 'admin', 'gerente');

-- 0) CLINICS (clínicas suscritas a la plataforma) ───────────
--    status: estado de la suscripción · plan: nivel contratado
--    manager_id: el gerente responsable de la clínica
CREATE TABLE clinics (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(160) NOT NULL,
    address     VARCHAR(255),
    phone       VARCHAR(30),
    status        VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente|activa|suspendida
    plan          VARCHAR(20) NOT NULL DEFAULT 'basico',    -- basico|pro
    manager_id    INTEGER,    -- FK a users(id); se enlaza tras crear el gerente
    store_enabled BOOLEAN     NOT NULL DEFAULT false,       -- tienda activada (solo plan Pro)
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1) USERS ──────────────────────────────────────────────────
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    phone         VARCHAR(30),
    address       VARCHAR(255),
    role          user_role     NOT NULL DEFAULT 'cliente',
    is_active     BOOLEAN       NOT NULL DEFAULT true,
    vet_requested BOOLEAN       NOT NULL DEFAULT false, -- solicitud de rol veterinario
    clinic_id     INTEGER       REFERENCES clinics(id) ON DELETE SET NULL, -- clínica del veterinario
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 2) REFRESH_TOKENS (sesiones de larga duración) ────────────
CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2b) PASSWORD_RESETS (recuperación de contraseña, token de un solo uso)
CREATE TABLE password_resets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3) PETS (el cliente registra la primera; el resto, el veterinario)
CREATE TABLE pets (
    id          SERIAL PRIMARY KEY,
    owner_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(80)  NOT NULL,
    species     VARCHAR(40),
    breed       VARCHAR(80),
    age         INTEGER,
    notes       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3b) PET_REQUESTS (solicitud de mascota adicional, la aprueba un vet)
CREATE TABLE pet_requests (
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

-- 4) VACCINES (historial de vacunación) ─────────────────────
CREATE TABLE vaccines (
    id            SERIAL PRIMARY KEY,
    pet_id        INTEGER      NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    vet_id        INTEGER      REFERENCES users(id) ON DELETE SET NULL, -- quién la registró
    name          VARCHAR(120) NOT NULL,
    applied_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
    notes         TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4b) EMERGENCY_ACCESS_LOG (auditoría de acceso a historiales)
-- El historial es portable entre clínicas; el acceso no se
-- bloquea, se registra ("break-glass").
CREATE TABLE emergency_access_log (
    id           SERIAL PRIMARY KEY,
    vet_id       INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id       INTEGER     NOT NULL REFERENCES pets(id)  ON DELETE CASCADE,
    accessed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) AVAILABILITY_SLOTS (horarios definidos por cada veterinario)
CREATE TABLE availability_slots (
    id          SERIAL PRIMARY KEY,
    vet_id      INTEGER      REFERENCES users(id) ON DELETE CASCADE,
    starts_at   TIMESTAMPTZ  NOT NULL,
    ends_at     TIMESTAMPTZ  NOT NULL,
    is_booked   BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 6) APPOINTMENTS (citas) ───────────────────────────────────
CREATE TABLE appointments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id)              ON DELETE CASCADE,
    pet_id      INTEGER      NOT NULL REFERENCES pets(id)               ON DELETE CASCADE,
    slot_id     INTEGER      NOT NULL UNIQUE REFERENCES availability_slots(id) ON DELETE RESTRICT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pendiente',  -- pendiente|confirmada|completada|cancelada
    notes       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 7) COURSES (por clínica) ──────────────────────────────────
CREATE TABLE courses (
    id           SERIAL PRIMARY KEY,
    clinic_id    INTEGER       REFERENCES clinics(id) ON DELETE CASCADE,
    title        VARCHAR(160)  NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    duration     VARCHAR(80),
    capacity     INTEGER       NOT NULL DEFAULT 20,
    starts_at    TIMESTAMPTZ,
    image_url    VARCHAR(300),
    active       BOOLEAN       NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 8) ENROLLMENTS (inscripciones) ────────────────────────────
CREATE TABLE enrollments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    course_id   INTEGER      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'activa',  -- activa|completada|cancelada
    enrolled_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

-- 9) PRODUCTS (tienda, por clínica) ─────────────────────────
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    clinic_id   INTEGER       REFERENCES clinics(id) ON DELETE CASCADE,
    name        VARCHAR(160)  NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url   VARCHAR(300),
    category    VARCHAR(80),
    active      BOOLEAN       NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 10) ORDERS (pedidos) ──────────────────────────────────────
CREATE TABLE orders (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    status           VARCHAR(20)   NOT NULL DEFAULT 'pendiente', -- pendiente|pagada|enviada|entregada|cancelada
    payment_method   VARCHAR(40),
    shipping_address VARCHAR(255),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 11) ORDER_ITEMS (líneas de pedido) ────────────────────────
CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER       NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id  INTEGER       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
);

-- 12) PAYMENTS (transacciones Wompi) ────────────────────────
CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER       NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id  VARCHAR(160)  UNIQUE,
    amount          NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    status          VARCHAR(20)   NOT NULL DEFAULT 'pendiente', -- pendiente|aprobado|rechazado|fallido
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 13) NOTIFICATIONS (correos transaccionales enviados) ──────
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(60)  NOT NULL,               -- cita|inscripcion|pedido
    status      VARCHAR(20)  NOT NULL DEFAULT 'enviada', -- enviada|fallida
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 14) CONVERSATIONS (chat de emergencia cliente-veterinario) ─
CREATE TABLE conversations (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vet_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'abierta', -- abierta|cerrada
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 15) MESSAGES (mensajes del chat) ──────────────────────────
CREATE TABLE messages (
    id               SERIAL PRIMARY KEY,
    conversation_id  INTEGER     NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body             TEXT        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Índices útiles ─────────────────────────────────────────
CREATE INDEX idx_refresh_user       ON refresh_tokens(user_id);
CREATE INDEX idx_pets_owner         ON pets(owner_id);
CREATE INDEX idx_vaccines_pet       ON vaccines(pet_id);
CREATE INDEX idx_slots_vet          ON availability_slots(vet_id);
CREATE INDEX idx_appointments_user  ON appointments(user_id);
CREATE INDEX idx_appointments_pet   ON appointments(pet_id);
CREATE INDEX idx_enrollments_user   ON enrollments(user_id);
CREATE INDEX idx_orders_user        ON orders(user_id);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_conversations_vet    ON conversations(vet_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_users_clinic   ON users(clinic_id);
CREATE INDEX idx_access_log_pet ON emergency_access_log(pet_id);
CREATE INDEX idx_access_log_vet ON emergency_access_log(vet_id);

-- ─── Datos semilla ──────────────────────────────────────────
INSERT INTO clinics (name, address, status, plan) VALUES ('PetGrooming Yopal', 'Yopal, Casanare', 'activa', 'pro');

-- Admin  (admin@petgrooming.com / admin123)
-- Vet    (vet@petgrooming.com   / vet123)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Administrador', 'admin@petgrooming.com',
   '$2a$10$CbAAqYBZ9Spd7.LQmryvX.G6foigkNVcwYb4mx9jY9pCQanbjY9o6', 'admin'),
  ('Dra. Veterinaria', 'vet@petgrooming.com',
   '$2a$10$dIhnsz2H06VDYepoHx0Ep.KVDa.jIUmkfKmqwcHIZYagVbjk03bZy', 'veterinario')
ON CONFLICT (email) DO NOTHING;

UPDATE users SET clinic_id = (SELECT id FROM clinics ORDER BY id LIMIT 1)
WHERE role = 'veterinario';
