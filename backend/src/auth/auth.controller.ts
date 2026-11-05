import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type {
  RequestAutenticada,
} from './types/request-autenticada.type.js';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //Registra un nuevo usuario
  @Post('registro')
  registro(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    registroDto: RegistroDto,
  ) {
    return this.authService.registro(registroDto);
  }
  //Inicia sesión y devuelve un token JWT si las credenciales son válidas
    @Post('login')
  @HttpCode(200)
  login(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    loginDto: LoginDto,
  ) {
    return this.authService.login(loginDto);
  }
  //Devuelve la información del usuario autenticado
    @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: RequestAutenticada) {
    return request.usuario;
  }

  //Obtiene todas las barberías a las que pertenece el usuario autenticado
    @Get('me/barberias')
  @UseGuards(JwtAuthGuard)
  misBarberias(@Req() request: RequestAutenticada) {
    return this.authService.misBarberias(
      request.usuario.id,
    );
  }
}