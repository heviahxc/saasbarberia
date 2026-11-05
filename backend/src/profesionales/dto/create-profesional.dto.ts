import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateProfesionalDto {
  @IsString()
  @Matches(/\S/, {
    message: 'El nombre debe contener al menos un carácter que no sea un espacio',
  })
  @MaxLength(100)
  nombre!: string;
}