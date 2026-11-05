import {
  Body,
  Controller,
  Param,
  Get,
  ParseIntPipe,
  Post,
  ValidationPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { ServiciosService } from './servicios.service.js';
import { CreateServicioDto } from './dto/create-servicio.dto.js';
import { CambiarEstadoServicioDto } from './dto/cambiar-estado-servicio.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MiembroBarberiaGuard } from '../auth/guards/miembro-barberia.guard.js';
import { AdministradorBarberiaGuard } from '../auth/guards/administrador-barberia.guard.js';
import { CambiarDuracionServicioDto } from './dto/cambiar-duracion-servicio.dto.js';
@Controller('barberias/:barberiaId/servicios')
@UseGuards(JwtAuthGuard, MiembroBarberiaGuard)
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  //Crea un nuevo servicio en la barbería especificada
  @Post()
  @UseGuards(AdministradorBarberiaGuard)
  create(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    createServicioDto: CreateServicioDto,
  ) {
    return this.serviciosService.create(barberiaId, createServicioDto);
  }
  //Obtiene todos los servicios de la barbería especificada
    @Get()
  findAll(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
  ) {
    return this.serviciosService.findAll(barberiaId);
  }

    @Patch(':servicioId/estado')
  @UseGuards(AdministradorBarberiaGuard)
  cambiarEstado(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    cambiarEstadoDto: CambiarEstadoServicioDto,
  ) {
    return this.serviciosService.cambiarEstado(
      barberiaId,
      servicioId,
      cambiarEstadoDto.activo,
    );
  }
    //Obtiene todos los servicios disponibles de la barbería especificada
    @Get('disponibles')
  findDisponibles(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
  ) {
    return this.serviciosService.findDisponibles(barberiaId);
  }
    @Patch(':servicioId/duracion')
  @UseGuards(AdministradorBarberiaGuard)
  cambiarDuracion(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CambiarDuracionServicioDto,
  ) {
    return this.serviciosService.cambiarDuracion(
      barberiaId,
      servicioId,
      dto.duracionMinutos,
    );
  }
}
