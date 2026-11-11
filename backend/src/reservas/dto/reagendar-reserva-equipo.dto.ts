import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReagendarReservaEquipoDto {
  @IsString()
  @MaxLength(40)
  @IsISO8601({
    strict: true,
    strictSeparator: true,
  })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'El inicio debe incluir hora y zona horaria',
  })
  inicio!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 300, {
    message: 'El motivo debe tener entre 5 y 300 caracteres',
  })
  motivo!: string;
}