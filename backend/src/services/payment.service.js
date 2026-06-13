import dotenv from 'dotenv';

dotenv.config();

// Servicio de pagos (placeholder para Stripe / MercadoPago / Wompi, etc.).
// Sustituye la lógica simulada por las llamadas reales a tu pasarela.

// Crea una "intención de pago" para un pedido.
export const createPaymentIntent = async ({ amount, currency = 'usd', metadata = {} }) => {
  if (!process.env.PAYMENT_API_KEY) {
    // Modo simulado: devuelve un id ficticio.
    return {
      id: `pi_mock_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      mocked: true,
      metadata,
    };
  }

  // TODO: integrar SDK real de la pasarela elegida.
  throw new Error('Integración de pasarela de pago no implementada todavía');
};

// Verifica/confirma un pago a partir de una referencia del proveedor.
export const confirmPayment = async (providerRef) => {
  return { providerRef, status: 'succeeded', mocked: true };
};
