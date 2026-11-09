import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import { InterpretationKind } from '../../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiTextProvider } from '../../modules/ai/ai-text-provider';
import { currentDeviceId } from '../context/request-context';
import { safeError } from '../logging/safe-error';
import { trackAiCalls } from './ai-call-tracker';

export interface OwnedReadingKey {
  /** Bumped when prompts or output shape change; old rows simply stop matching. */
  version: string;
  kind: InterpretationKind;
  locale: string;
  rawKey: string;
}

/**
 * Read-through cache for AI readings, always scoped to the current subject.
 *
 * Readings are keyed by birth data, which is not a secret: a cache shared
 * across devices would let anyone who knows someone's birth details read their
 * stored readings, and those rows would survive the owner's data deletion. So
 * the owner is part of the key and every row carries it in `deviceId` —
 * `DELETE /me/data` removes them all and nobody else can ever hit them.
 *
 * A miss runs `build`; templated stubs (no provider, or an AI call failed
 * while building) are served but never stored.
 */
export async function ownedReading<T>(
  deps: { prisma: PrismaService; ai: AiTextProvider; logger: Logger },
  key: OwnedReadingKey,
  build: () => Promise<T>,
): Promise<T> {
  const owner = currentDeviceId() ?? null;
  const cacheKey = createHash('sha256')
    .update(`${key.version}|${key.locale}|${owner ?? '-'}|${key.rawKey}`)
    .digest('hex');

  try {
    const hit = await deps.prisma.interpretation.findUnique({ where: { cacheKey } });
    if (hit && hit.deviceId === owner) return hit.content as T;
  } catch (err) {
    deps.logger.warn(`cache read failed: ${safeError(err)}`);
  }

  if (!deps.ai.available) return build();
  const { value: content, failed } = await trackAiCalls(build);
  if (failed) return content;

  try {
    await deps.prisma.interpretation.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        kind: key.kind,
        locale: key.locale,
        content: content as object,
        model: deps.ai.model,
        deviceId: owner,
      },
      update: {},
    });
  } catch (err) {
    deps.logger.warn(`cache write failed: ${safeError(err)}`);
  }
  return content;
}
