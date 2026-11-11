import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
  Patch,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MiembroBarberiaGuard } from '../auth/guards/miembro-barberia.guard.js';
import type {
  RequestAutenticada,
} from '../auth/types/request-autenticada.type.js';

import { BarberiasService } from './barberias.service.js';
import { CreateBarberiaDto } from './dto/create-barberia.dto.js';
import { AdministradorBarberiaGuard } from '../auth/guards/administrador-barberia.guard.js';
import { ActualizarBarberiaDto } from './dto/actualizar-barberia.dto.js';
@Controller('barberias')
@UseGuards(JwtAuthGuard)
export class BarberiasController {
  constructor(
    private readonly barberiasService: BarberiasService,
  ) {}

  @Get()
  findAll(@Req() request: RequestAutenticada) {
    return this.barberiasService.findAll(request.usuario.id);
  }

  @Get(':barberiaId')
  @UseGuards(MiembroBarberiaGuard)
  findOne(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
  ) {
    return this.barberiasService.findOne(barberiaId);
  }

  @Post()
  create(
    @Req() request: RequestAutenticada,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    createBarberiaDto: CreateBarberiaDto,
  ) {
    return this.barberiasService.create(
      createBarberiaDto,
      request.usuario.id,
    );
  }

  @Patch(':barberiaId')
@UseGuards(MiembroBarberiaGuard, AdministradorBarberiaGuard)
actualizar(
  @Param('barberiaId', ParseIntPipe) barberiaId: number,
  @Body(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  dto: ActualizarBarberiaDto,
) {
  return this.barberiasService.actualizar(barberiaId, dto);
}
}