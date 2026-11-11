import { IsString, Matches, MaxLength, IsOptional } from 'class-validator';
export class CreateBloqueoLocalDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  inicioLocal!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  finLocal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
