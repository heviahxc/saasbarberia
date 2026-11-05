import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServicioDto {
  @IsString()
  @Matches(/\S/, {
    message: 'El nombre no puede estar vacío',
  })
  @MaxLength(100)
  nombre!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  duracionMinutos!: number;

  @IsString()
  @Matches(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/, {
    message:
      'El precio debe ser un texto entre 0 y 99999999.99, con máximo dos decimales',
  })
  precio!: string;
}