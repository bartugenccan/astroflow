import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { CLIENT_EVENT_KINDS, ECLIPSE_MAX_DAYS, MascotEventKind } from '../mascot-rules';

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

/** Rest for this many local days, starting today. */
export class MascotEclipseDto {
  @IsInt()
  @Min(1)
  @Max(ECLIPSE_MAX_DAYS)
  days: number;
}

/** Switch the Nova look on or off (stage 5). */
export class MascotLookDto {
  @IsBoolean()
  novaLook: boolean;
}
