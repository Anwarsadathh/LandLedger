import bcrypt from "bcryptjs";

// bcryptjs is pure-JS (no native build) — safe on serverless. Cost 10 is a
// reasonable default for interactive logins.
const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
