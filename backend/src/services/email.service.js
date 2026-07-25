import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'PetGrooming <onboarding@resend.dev>';

// Envía un correo. Si no hay API key configurada, solo lo registra en consola.
export const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.log(`✉️  [DEV] Email a ${to}: ${subject}`);
    return { mocked: true };
  }

  try {
    const data = await resend.emails.send({ from: FROM, to, subject, html });
    return data;
  } catch (err) {
    console.error('Error enviando email:', err);
    throw err;
  }
};

// Plantilla: recuperación de contraseña (enlace de un solo uso, expira en 1 h).
export const sendPasswordReset = (to, { name, resetUrl }) =>
  sendEmail({
    to,
    subject: 'Restablece tu contraseña — PetGrooming 🐾',
    html: `<h2>Hola, ${name}</h2>
           <p>Recibimos una solicitud para restablecer tu contraseña.</p>
           <p><a href="${resetUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;
              padding:10px 24px;border-radius:9999px;text-decoration:none;font-weight:bold">
              Crear nueva contraseña</a></p>
           <p>El enlace vence en <strong>1 hora</strong> y solo puede usarse una vez.</p>
           <p style="color:#64748b;font-size:13px">Si no fuiste tú, ignora este correo: tu contraseña seguirá igual.</p>`,
  });

// Plantilla: comprobante de pago de la suscripción.
export const sendSubscriptionReceipt = (to, { name, clinicName, plan, amount, expiresAt }) =>
  sendEmail({
    to,
    subject: `Pago recibido — suscripción ${plan} de ${clinicName} 🏥`,
    html: `<h2>¡Gracias, ${name}!</h2>
           <p>Recibimos el pago de la suscripción de <strong>${clinicName}</strong>.</p>
           <ul>
             <li>Plan: <strong style="text-transform:capitalize">${plan}</strong></li>
             <li>Valor: <strong>$ ${Number(amount).toLocaleString('es-CO')} COP</strong></li>
             <li>Tu veterinaria está activa hasta el <strong>${expiresAt}</strong></li>
           </ul>
           <p style="color:#64748b;font-size:13px">Te avisaremos antes de que venza para que renueves sin interrupciones.</p>`,
  });

// Plantilla: suspensión por vencimiento de la suscripción.
export const sendSubscriptionSuspended = (to, { name, clinicName }) =>
  sendEmail({
    to,
    subject: `Tu suscripción venció — ${clinicName} ⚠️`,
    html: `<h2>Hola, ${name}</h2>
           <p>La suscripción de <strong>${clinicName}</strong> venció, así que su servicio quedó
              <strong>suspendido</strong>: tus veterinarios no pueden atender y tu tienda no es visible.</p>
           <p>Puedes reactivarla al instante renovando tu plan desde el panel de tu veterinaria.</p>
           <p style="color:#64748b;font-size:13px">Tus datos, historiales y citas están intactos: se restablecen apenas renueves.</p>`,
  });

// Plantilla: confirmación de cita.
export const sendAppointmentConfirmation = (to, { petName, date }) =>
  sendEmail({
    to,
    subject: 'Confirmación de tu cita en PetGrooming 🐾',
    html: `<h2>¡Cita confirmada!</h2>
           <p>Tu mascota <strong>${petName}</strong> tiene cita el <strong>${date}</strong>.</p>
           <p>Gracias por confiar en PetGrooming.</p>`,
  });
