import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CancelarReservaEquipoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 300, {
    message: 'El motivo debe tener entre 5 y 300 caracteres',
  })
  motivo!: string;
}