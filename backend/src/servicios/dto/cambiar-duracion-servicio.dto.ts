import { IsInt, Max, Min } from 'class-validator';

export class CambiarDuracionServicioDto {
  @IsInt()
  @Min(1)
  @Max(1440)
  duracionMinutos!: number;
}
