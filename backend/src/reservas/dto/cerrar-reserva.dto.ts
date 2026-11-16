import { IsIn } from 'class-validator';

export class CerrarReservaDto {
  @IsIn(['ATENDIDA', 'NO_ASISTIO'], {
    message: 'El estado debe ser ATENDIDA o NO_ASISTIO',
  })
  estado!: 'ATENDIDA' | 'NO_ASISTIO';
}