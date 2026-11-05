import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

import { ConsultarAgendaDto } from './consultar-agenda.dto.js';

export class ConsultarDisponibilidadDto extends ConsultarAgendaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  profesionalId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  servicioId!: number;
}