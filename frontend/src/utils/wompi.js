// Construye la URL del Web Checkout de Wompi a partir de los datos
// de pago que devuelve el backend (createOrder / payOrder).
export const wompiCheckoutUrl = (p) =>
  `${p.checkoutBase}?public-key=${encodeURIComponent(p.publicKey)}` +
  `&currency=${p.currency}&amount-in-cents=${p.amountInCents}` +
  `&reference=${encodeURIComponent(p.reference)}` +
  `&signature%3Aintegrity=${p.integritySignature}` +
  `&redirect-url=${encodeURIComponent(`${window.location.origin}/payment-result`)}`;
