import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearInvitacionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  profesionalId!: number;
}

export class TokenInvitacionDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'El enlace de invitación no es válido',
  })
  token!: string;
}
