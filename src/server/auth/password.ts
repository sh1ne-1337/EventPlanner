import "server-only";

import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}

let dummyHash: Promise<string> | undefined;

export async function fakeVerifyPassword(password: string) {
  dummyHash ??= hashPassword("timing-attack-mitigation-placeholder");
  await verify(await dummyHash, password);
  return false;
}
