-- ============================================================
--  Migración 003 · Chat de emergencia cliente-veterinario
--  Segura de ejecutar varias veces (IF NOT EXISTS).
-- ============================================================

-- Conversación de urgencia entre un cliente y un veterinario.
CREATE TABLE IF NOT EXISTS conversations (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vet_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'abierta', -- abierta|cerrada
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Mensajes de cada conversación.
CREATE TABLE IF NOT EXISTS messages (
    id               SERIAL PRIMARY KEY,
    conversation_id  INTEGER     NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body             TEXT        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vet    ON conversations(vet_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
