#!/usr/bin/env node
/**
 * Prints a fresh AUTH_ENCRYPTION_KEY (48 random bytes, base64 → 64 chars).
 *
 *   npm run gen:auth-key --workspace @astroflow/api
 *
 * Set it once per environment and never rotate it casually: the key seals
 * Sign in with Apple refresh tokens and the signed-in users' notes backup
 * (user_vaults). A new key makes everything sealed with the old one unreadable.
 * Put the production value only in the server's secret store, never in git.
 */
import { randomBytes } from 'node:crypto';

const key = randomBytes(48).toString('base64');
console.log(`AUTH_ENCRYPTION_KEY=${key}`);
