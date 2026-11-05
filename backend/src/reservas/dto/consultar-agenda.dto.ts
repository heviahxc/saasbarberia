import {
  IsISO8601,
  IsString,
  Matches,
} from 'class-validator';

export class ConsultarAgendaDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true })
  fecha!: string;
}