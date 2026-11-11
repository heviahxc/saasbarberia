
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

import { Transform } from 'class-transformer';

const normalizar = (value: unknown) => typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : value;

export class CreateBarberiaDto {
  @Transform(({ value }) => normalizar(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nombre!: string;

  @Transform(({ value }) => normalizar(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  ciudad!: string;

  @IsOptional()
  @Transform(({ value }) => normalizar(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  direccion?: string;

}
