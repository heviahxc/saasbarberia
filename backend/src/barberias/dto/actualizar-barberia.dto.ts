import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsIn,
  ValidateIf,
  IsString,
  MaxLength,
} from 'class-validator';

function normalizarTexto(valor: unknown): unknown {
  return typeof valor === 'string'
    ? valor.normalize('NFC').trim().replace(/\s+/gu, ' ')
    : valor;
}

export class ActualizarBarberiaDto {
  @Transform(({ value }) => normalizarTexto(value))
  @IsString()
  @IsNotEmpty({
    message: 'El nombre de la barbería es obligatorio',
  })
  @MaxLength(100)
  nombre!: string;

  @Transform(({ value }) => normalizarTexto(value))
  @IsString()
  @IsNotEmpty({
    message: 'La ciudad es obligatoria',
  })
  @MaxLength(100)
  ciudad!: string;

  @Transform(({ value }) => normalizarTexto(value))
  @IsString()
  @IsNotEmpty({
    message: 'La dirección es obligatoria',
  })
  @MaxLength(250)
  direccion!: string;
  @ValidateIf((_obj, value) => value !== undefined)
  @IsIn([15, 30], { message: 'El intervalo de reservas debe ser de 15 o 30 minutos' })
  intervaloReservasMinutos?: number;
}