import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateBloqueoDto {
  @IsString()
  @MaxLength(40)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'El inicio debe incluir hora y zona horaria',
  })
  inicio!: string;

  @IsString()
  @MaxLength(40)
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'El fin debe incluir hora y zona horaria',
  })
  fin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}