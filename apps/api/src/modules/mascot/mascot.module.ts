import { Module } from '@nestjs/common';
import { MascotController } from './mascot.controller';
import { MascotService } from './mascot.service';

@Module({
  controllers: [MascotController],
  providers: [MascotService],
  exports: [MascotService],
})
export class MascotModule {}
