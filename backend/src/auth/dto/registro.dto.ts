import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @IsString()
  @Matches(/\S/, {
    message: 'El nombre no puede estar vacío',
  })
  @MaxLength(100)
  nombre!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(15)
  @MaxLength(128)
  password!: string;
}