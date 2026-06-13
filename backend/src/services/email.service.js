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

// Plantilla: confirmación de cita.
export const sendAppointmentConfirmation = (to, { petName, date }) =>
  sendEmail({
    to,
    subject: 'Confirmación de tu cita en PetGrooming 🐾',
    html: `<h2>¡Cita confirmada!</h2>
           <p>Tu mascota <strong>${petName}</strong> tiene cita el <strong>${date}</strong>.</p>
           <p>Gracias por confiar en PetGrooming.</p>`,
  });
