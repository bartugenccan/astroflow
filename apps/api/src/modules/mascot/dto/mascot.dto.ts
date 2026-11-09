import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength } from 'class-validator';
import { CLIENT_EVENT_KINDS, MascotEventKind } from '../mascot-rules';

/** An action that happened on the device (affirmation, tarot, ritual…). */
export class MascotEventDto {
  @IsIn(CLIENT_EVENT_KINDS as unknown as string[])
  kind: MascotEventKind;
}

export class MascotPurchaseDto {
  @IsString()
  @MaxLength(40)
  itemId: string;
}

export class MascotEquipDto {
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  itemIds: string[];
}
