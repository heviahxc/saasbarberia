
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateBarberiaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  ciudad!: string;
}
