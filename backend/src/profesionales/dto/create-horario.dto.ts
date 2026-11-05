import { IsInt, Max, Min } from 'class-validator';

export class CreateHorarioDto {
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana!: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  inicioMinuto!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  finMinuto!: number;
}