import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM for the few secrets we must keep (Sign in with Apple refresh
 * tokens, needed to revoke on account deletion). The key is derived from
 * AUTH_ENCRYPTION_KEY, so any long random string works. Format:
 * `v1.<iv>.<tag>.<ciphertext>` (base64url).
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash('sha256').update(secret).digest();
  }

  seal(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv, tag, data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
  }

  open(sealed: string): string {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unrecognised sealed secret');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  }
}
