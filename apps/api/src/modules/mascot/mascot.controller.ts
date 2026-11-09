import { BadRequestException, Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { MascotService } from './mascot.service';
import { MascotEclipseDto, MascotEquipDto, MascotEventDto, MascotPurchaseDto } from './dto/mascot.dto';
import { lunarWindow } from './mascot-rules';

@ApiTags('Mascot')
@ApiBearerAuth()
@Controller('mascot')
export class MascotController {
  constructor(private readonly mascot: MascotService) {}

  @Get()
  @ApiOperation({ summary: "Aster's state: stage, Işık, Yıldız Tozu, energy, today's quests, shop" })
  get(@DeviceId() deviceId: string) {
    return this.mascot.getState(deviceId);
  }

  @Post('events')
  @ApiOperation({ summary: 'Report a device-side positive action (capped per day) → growth delta' })
  async event(@Body() dto: MascotEventDto, @DeviceId() deviceId: string) {
    let refKey = '';
    if (dto.kind === 'MOON_RITUAL') {
      // Only inside a new / full moon window, once per lunation phase.
      const window = lunarWindow(new Date());
      if (!window) throw new BadRequestException('No new or full moon right now');
      refKey = `${window.phase}:${window.peakDate}`;
    }
    const delta = await this.mascot.award(deviceId, dto.kind, refKey);
    return { delta, state: await this.mascot.getState(deviceId) };
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Spend Yıldız Tozu on an accessory or a streak shield' })
  purchase(@Body() dto: MascotPurchaseDto, @DeviceId() deviceId: string) {
    return this.mascot.purchase(deviceId, dto.itemId);
  }

  @Post('equip')
  @ApiOperation({ summary: 'Set the accessories Aster wears (one per slot)' })
  equip(@Body() dto: MascotEquipDto, @DeviceId() deviceId: string) {
    return this.mascot.equip(deviceId, dto.itemIds);
  }

  @Post('eclipse')
  @ApiOperation({ summary: 'Start an eclipse: a chosen rest that pauses streaks and nudges' })
  startEclipse(@Body() dto: MascotEclipseDto, @DeviceId() deviceId: string) {
    return this.mascot.startEclipse(deviceId, dto.days);
  }

  @Delete('eclipse')
  @ApiOperation({ summary: 'Wake from an eclipse early' })
  endEclipse(@DeviceId() deviceId: string) {
    return this.mascot.endEclipse(deviceId);
  }

  @Get('constellations')
  @ApiOperation({ summary: 'The constellation album: every key, found or not' })
  constellations(@DeviceId() deviceId: string) {
    return this.mascot.constellations(deviceId);
  }
}
