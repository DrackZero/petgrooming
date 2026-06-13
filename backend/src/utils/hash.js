import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Genera el hash de una contraseña en texto plano.
export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// Compara una contraseña en texto plano con su hash.
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
