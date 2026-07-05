import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Integración con Wompi (Web Checkout + webhook de eventos).
// Si no hay llaves configuradas, la tienda opera en modo simulado.

export const wompiEnabled = () =>
  Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET);

// Construye los datos del Web Checkout para un pedido.
// La firma de integridad es SHA256(referencia + monto_en_centavos + moneda + secreto).
export const buildCheckout = (orderId, totalCOP) => {
  const reference = `PG-${orderId}`;
  const amountInCents = Math.round(Number(totalCOP) * 100);
  const currency = 'COP';
  const integritySignature = crypto
    .createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET}`)
    .digest('hex');

  return {
    provider: 'wompi',
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    reference,
    amountInCents,
    currency,
    integritySignature,
    checkoutBase: 'https://checkout.wompi.co/p/',
  };
};

// Verifica el checksum de un evento del webhook de Wompi.
// checksum = SHA256(valores de signature.properties concatenados + timestamp + secreto_eventos)
export const verifyEventChecksum = (event) => {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) return true; // sin secreto configurado no se puede validar (modo dev)

  const { properties = [], checksum } = event.signature || {};
  const values = properties
    .map((path) => path.split('.').reduce((obj, key) => obj?.[key], event.data))
    .join('');
  const expected = crypto
    .createHash('sha256')
    .update(`${values}${event.timestamp}${secret}`)
    .digest('hex');

  return Boolean(checksum) && expected.toLowerCase() === String(checksum).toLowerCase();
};

// Pago simulado (cuando no hay llaves de Wompi, p. ej. en desarrollo).
export const mockPayment = (orderId, totalCOP) => ({
  provider: 'mock',
  mocked: true,
  reference: `PG-${orderId}`,
  amountInCents: Math.round(Number(totalCOP) * 100),
  status: 'pendiente',
});
