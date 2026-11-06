import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PATRON_NOMBRE =
  /^\p{L}[\p{L}\p{M}]*(?:[ '’\-]\p{L}[\p{L}\p{M}]*)*$/u;

export function NombrePersona(
  etiqueta: string,
  opcional = false,
) {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;

      const normalizado = value
        .normalize('NFC')
        .trim()
        .replace(/\s+/gu, ' ');

      return opcional && normalizado === ''
        ? null
        : normalizado;
    }),

    ...(opcional ? [IsOptional()] : []),

    IsString({
      message: `${etiqueta} debe ser un texto`,
    }),

    MaxLength(100, {
      message: `${etiqueta} no puede superar los 100 caracteres`,
    }),

    Matches(PATRON_NOMBRE, {
      message:
        `${etiqueta} debe contener letras y puede incluir ` +
        'espacios, guiones o apóstrofes entre palabras',
    }),
  );
}