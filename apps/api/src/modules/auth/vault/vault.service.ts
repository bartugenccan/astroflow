import {
  ConflictException,
  ForbiddenException,
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SecretBox } from '../account/secret-box';

export const VAULT_NAMESPACES = ['reflections', 'affirmations', 'tarot', 'election'] as const;
export type VaultNamespace = (typeof VAULT_NAMESPACES)[number];
/** Per namespace, measured on the JSON the device sends. */
export const VAULT_MAX_BYTES = 256 * 1024;

export interface VaultEntry {
  namespace: VaultNamespace;
  version: number;
  /** The device's own JSON, opaque to the server. */
  blob: string;
  updatedAt: string;
}

/**
 * An encrypted backup of what the app otherwise keeps only on the device
 * (reflections, affirmations, tarot and election notes), so a signed-in user
 * gets them back on a new phone. Sealed with a server key derived from
 * AUTH_ENCRYPTION_KEY — encryption at rest, not end-to-end. Never read by
 * anything but this service, and never sent to the AI.
 *
 * Optimistic concurrency: a write names the version it was based on; a stale
 * write gets 409 with the server copy so the device can merge and retry.
 */
@Injectable()
export class VaultService {
  private readonly box: SecretBox | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const key = config.get<string>('AUTH_ENCRYPTION_KEY') ?? '';
    // A separate derivation, so vault blobs and Apple tokens never share a key.
    this.box = key ? new SecretBox(`${key}:vault`) : null;
  }

  private sealer(): SecretBox {
    if (!this.box) throw new ServiceUnavailableException('Backup is not configured');
    return this.box;
  }

  private async requireAccount(subjectId: string): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { subjectId }, select: { id: true } });
    if (!account) throw new ForbiddenException({ code: 'ACCOUNT_REQUIRED', message: 'Sign in to back up your notes' });
  }

  async list(subjectId: string): Promise<VaultEntry[]> {
    await this.requireAccount(subjectId);
    const box = this.sealer();
    const rows = await this.prisma.userVault.findMany({ where: { deviceId: subjectId } });
    return rows.map((r) => ({
      namespace: r.namespace as VaultNamespace,
      version: r.version,
      blob: box.open(r.sealed),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async put(subjectId: string, namespace: VaultNamespace, blob: string, baseVersion: number): Promise<VaultEntry> {
    await this.requireAccount(subjectId);
    if (Buffer.byteLength(blob, 'utf8') > VAULT_MAX_BYTES) throw new PayloadTooLargeException('Backup too large');
    const box = this.sealer();
    const sealed = box.seal(blob);
    const where = { deviceId_namespace: { deviceId: subjectId, namespace } };

    if (baseVersion === 0) {
      try {
        const row = await this.prisma.userVault.create({ data: { deviceId: subjectId, namespace, sealed } });
        return { namespace, version: row.version, blob, updatedAt: row.updatedAt.toISOString() };
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
        return this.conflict(subjectId, namespace);
      }
    }
    const res = await this.prisma.userVault.updateMany({
      where: { deviceId: subjectId, namespace, version: baseVersion },
      data: { sealed, version: { increment: 1 } },
    });
    if (res.count === 0) return this.conflict(subjectId, namespace);
    const row = await this.prisma.userVault.findUniqueOrThrow({ where });
    return { namespace, version: row.version, blob, updatedAt: row.updatedAt.toISOString() };
  }

  private async conflict(subjectId: string, namespace: VaultNamespace): Promise<never> {
    const row = await this.prisma.userVault.findUnique({
      where: { deviceId_namespace: { deviceId: subjectId, namespace } },
    });
    throw new ConflictException({
      code: 'VAULT_STALE',
      server: row
        ? {
            namespace,
            version: row.version,
            blob: this.sealer().open(row.sealed),
            updatedAt: row.updatedAt.toISOString(),
          }
        : null,
    });
  }
}
