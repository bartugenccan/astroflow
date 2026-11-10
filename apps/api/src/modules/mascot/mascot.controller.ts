import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { MascotService } from './mascot.service';
import { MascotEclipseDto, MascotEquipDto, MascotEventDto, MascotLookDto, MascotPurchaseDto } from './dto/mascot.dto';
import { isSkyLessonKey, lunarWindow, SkyLessonKey } from './mascot-rules';

function lessonKey(key: string): SkyLessonKey {
  if (!isSkyLessonKey(key)) throw new NotFoundException('Unknown lesson');
  return key;
}

@ApiTags('Mascot')
@ApiBearerAuth()
@Controller('mascot')
export class MascotController {
  constructor(private readonly mascot: MascotService) {}

  @Get()
  @ApiOperation({ summary: "Aster's state: stage, Işık, Yıldız Tozu, energy, today's counts, shop, Harita Yolu, next unlocks" })
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

  @Post('lessons/:key/complete')
  @ApiOperation({ summary: 'Finish a Harita Yolu chapter → SKY_LESSON award (chapter must be open)' })
  completeLesson(@Param('key') key: string, @DeviceId() deviceId: string) {
    return this.mascot.completeLesson(deviceId, lessonKey(key));
  }

  @Post('lessons/:key/unlock')
  @ApiOperation({ summary: 'Open a stage-locked chapter early for Yıldız Tozu' })
  unlockLesson(@Param('key') key: string, @DeviceId() deviceId: string) {
    return this.mascot.unlockLessonEarly(deviceId, lessonKey(key));
  }

  @Patch('look')
  @ApiOperation({ summary: 'Switch the Nova look (stage 5) on or off' })
  look(@Body() dto: MascotLookDto, @DeviceId() deviceId: string) {
    return this.mascot.setNovaLook(deviceId, dto.novaLook);
  }

  @Get('constellations')
  @ApiOperation({ summary: 'The constellation album: every key, found or not' })
  constellations(@DeviceId() deviceId: string) {
    return this.mascot.constellations(deviceId);
  }
}
