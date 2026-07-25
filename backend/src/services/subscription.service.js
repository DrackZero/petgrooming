import { query } from '../config/db.js';
import { wompiEnabled } from './payment.service.js';
import { sendSubscriptionReceipt, sendSubscriptionSuspended } from './email.service.js';

// Ciclo de vida de la suscripción de una clínica.
// Cada pago cubre SUBSCRIPTION_DAYS días; al vencer, la clínica se
// suspende sola y sus veterinarios dejan de operar (candado existente).

// Precio mensual de cada plan (COP).
export const PLAN_PRICES = { basico: 60000, pro: 150000 };
export const VALID_PLANS = Object.keys(PLAN_PRICES);

// Días que cubre un pago. Configurable para poder demostrar el ciclo
// completo sin esperar un mes real.
export const subscriptionDays = () => Number(process.env.SUBSCRIPTION_DAYS || 30);

// Modo simulado: el gerente "paga" sin pasar por Wompi. Se activa con
// SUBSCRIPTION_MOCK=true, o automáticamente si no hay llaves de Wompi.
export const subscriptionMockEnabled = () =>
  process.env.SUBSCRIPTION_MOCK === 'true' || !wompiEnabled();

// Registra un pago aprobado: activa la clínica, extiende su vigencia y
// deja el cobro en el historial. Si a la clínica aún le queda tiempo, el
// nuevo periodo se SUMA al restante (no se pierde lo ya pagado).
export const registerSubscriptionPayment = async ({ clinicId, plan, provider, reference }) => {
  if (!VALID_PLANS.includes(plan)) return null;

  const days = subscriptionDays();
  const amount = PLAN_PRICES[plan];

  const { rows } = await query(
    `UPDATE clinics
     SET status = 'activa',
         plan = $1,
         subscription_expires_at =
           GREATEST(COALESCE(subscription_expires_at, now()), now()) + ($2 || ' days')::interval
     WHERE id = $3
     RETURNING id, name, plan, status, subscription_expires_at, manager_id`,
    [plan, days, clinicId]
  );
  if (!rows.length) return null;
  const clinic = rows[0];

  const payment = await query(
    `INSERT INTO subscription_payments
       (clinic_id, plan, amount, provider, reference, period_start, period_end)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz - ($7 || ' days')::interval, $6)
     RETURNING *`,
    [clinic.id, plan, amount, provider, reference || null, clinic.subscription_expires_at, days]
  );

  notifyReceipt(clinic, plan, amount).catch(() => {});
  return { clinic, payment: payment.rows[0] };
};

// Comprobante de pago al gerente (best-effort, no bloquea la respuesta).
const notifyReceipt = async (clinic, plan, amount) => {
  if (!clinic.manager_id) return;
  const { rows } = await query('SELECT name, email FROM users WHERE id = $1', [clinic.manager_id]);
  if (!rows.length) return;
  await sendSubscriptionReceipt(rows[0].email, {
    name: rows[0].name,
    clinicName: clinic.name,
    plan,
    amount,
    expiresAt: new Date(clinic.subscription_expires_at).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  });
};

// Suspende las clínicas cuya vigencia ya venció. Barata (índice sobre
// subscription_expires_at) y normalmente afecta 0 filas: se llama antes
// de las lecturas que dependen del estado, igual que expireStaleOrders.
export const expireOverdueSubscriptions = async () => {
  const { rows } = await query(
    `UPDATE clinics
     SET status = 'suspendida', store_enabled = false
     WHERE status = 'activa'
       AND subscription_expires_at IS NOT NULL
       AND subscription_expires_at < now()
     RETURNING id, name, manager_id`
  );
  for (const c of rows) notifySuspended(c).catch(() => {});
  return rows;
};

// Aviso de suspensión por impago al gerente.
const notifySuspended = async (clinic) => {
  if (!clinic.manager_id) return;
  const { rows } = await query('SELECT name, email FROM users WHERE id = $1', [clinic.manager_id]);
  if (!rows.length) return;
  await sendSubscriptionSuspended(rows[0].email, {
    name: rows[0].name,
    clinicName: clinic.name,
  });
};
