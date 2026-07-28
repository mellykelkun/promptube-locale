import "server-only";

import { hash, verify } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";

export const passwordPolicy = {
  maximumLength: 128,
  minimumLength: 14,
};

export const argon2idOptions: Options = {
  algorithm: 2,
  memoryCost: 64 * 1024,
  parallelism: 1,
  timeCost: 3,
};

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < passwordPolicy.minimumLength) {
    return "Le mot de passe doit contenir au moins 14 caracteres.";
  }

  if (password.length > passwordPolicy.maximumLength) {
    return "Le mot de passe doit contenir au maximum 128 caracteres.";
  }

  return null;
}

export async function hashAdminPassword(password: string): Promise<string> {
  const violation = validatePasswordPolicy(password);

  if (violation) {
    throw new Error(violation);
  }

  return hash(password, argon2idOptions);
}

export async function verifyAdminPassword(data: {
  hash: string;
  password: string;
}): Promise<boolean> {
  return verify(data.hash, data.password, argon2idOptions);
}
