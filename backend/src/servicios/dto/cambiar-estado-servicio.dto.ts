import { IsBoolean } from 'class-validator';

export class CambiarEstadoServicioDto {
  @IsBoolean()
  activo!: boolean;
}
