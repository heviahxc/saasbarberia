import { IsInt, Min } from 'class-validator';

export class AsignarServicioDto {
  @IsInt()
  @Min(1)
  servicioId!: number;
}