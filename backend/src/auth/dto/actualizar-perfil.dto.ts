import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

import { NombrePersona } from '../../common/validators/nombre-persona.decorator.js';

export class ActualizarPerfilDto {
  @NombrePersona('El nombre')
  nombre!: string;

  @NombrePersona('El apellido paterno')
  apellidoPaterno!: string;

  @NombrePersona('El apellido materno', true)
  apellidoMaterno?: string | null;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({
    message: 'El teléfono debe ser un texto',
  })
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'El teléfono debe incluir el prefijo internacional, sin espacios. Ejemplo: +56912345678',
  })
  telefono!: string;
}