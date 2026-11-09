import { Body, Controller, Get, Param, ParseEnumPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { DeviceId } from '../../../common/device/device-id.decorator';
import { VAULT_NAMESPACES, VaultNamespace, VaultService } from './vault.service';

class VaultPutDto {
  /** The device's JSON for this namespace (size-checked by the service). */
  @IsString()
  blob: string;

  /** The version this write is based on; 0 = first write. */
  @IsInt()
  @Min(0)
  baseVersion: number;
}

const NAMESPACES = Object.fromEntries(VAULT_NAMESPACES.map((n) => [n, n])) as Record<VaultNamespace, VaultNamespace>;

@ApiTags('Vault')
@ApiBearerAuth()
@Controller('vault')
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  @Get()
  @ApiOperation({ summary: "Signed-in only: the encrypted backup of the device's notes" })
  list(@DeviceId() subjectId: string) {
    return this.vault.list(subjectId);
  }

  @Put(':namespace')
  @ApiOperation({ summary: 'Signed-in only: write one namespace (409 + server copy when stale)' })
  put(
    @DeviceId() subjectId: string,
    @Param('namespace', new ParseEnumPipe(NAMESPACES)) namespace: VaultNamespace,
    @Body() dto: VaultPutDto,
  ) {
    return this.vault.put(subjectId, namespace, dto.blob, dto.baseVersion);
  }
}
