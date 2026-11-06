import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { NombrePersona } from '../../common/validators/nombre-persona.decorator.js';

export class RegistroDto {
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

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsEmail({}, {
    message: 'El correo electrónico no es válido',
  })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(128, {
    message: 'La contraseña no puede superar los 128 caracteres',
  })
  password!: string;
}