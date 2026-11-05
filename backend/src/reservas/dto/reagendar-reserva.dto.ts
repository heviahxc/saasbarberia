import {
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReagendarReservaDto {
  @IsString()
  @MaxLength(40)
  @IsISO8601({
    strict: true,
    strictSeparator: true,
  })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})$/,
    {
      message:
        'El inicio debe incluir fecha, hora y zona horaria, con segundos en cero',
    },
  )
  inicio!: string;
}