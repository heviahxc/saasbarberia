import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { ProfesionalesService } from './profesionales.service.js';
import { CreateProfesionalDto } from './dto/create-profesional.dto.js';
import { AsignarServicioDto } from './dto/asignar-servicio.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MiembroBarberiaGuard } from '../auth/guards/miembro-barberia.guard.js';
import { AdministradorBarberiaGuard } from '../auth/guards/administrador-barberia.guard.js';
import { CreateHorarioDto } from './dto/create-horario.dto.js';
@Controller('barberias/:barberiaId/profesionales')
@UseGuards(JwtAuthGuard, MiembroBarberiaGuard)
export class ProfesionalesController {
  constructor(
    private readonly profesionalesService: ProfesionalesService,
  ) {}

  // POST /barberias/:barberiaId/profesionales hace que un administrador de la barbería cree un nuevo profesional en la barbería especificada.
  // GET /barberias/:barberiaId/profesionales hace que un miembro de la barbería obtenga todos los profesionales de la barbería especificada.
  // POST /barberias/:barberiaId/profesionales/:profesionalId/servicios hace que un administrador de la barbería asigne un servicio a un profesional específico en la barbería especificada.
  // GET /barberias/:barberiaId/profesionales/:profesionalId/servicios hace que un miembro de la barbería obtenga todos los servicios asignados a un profesional específico en la barbería especificada.
  // DELETE /barberias/:barberiaId/profesionales/:profesionalId/servicios/:servicioId hace que un administrador de la barbería quite un servicio asignado a un profesional específico en la barbería especificada.
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
    createProfesionalDto: CreateProfesionalDto,
  ) {
    return this.profesionalesService.create(
      barberiaId,
      createProfesionalDto,
    );
  }
     @Get()
  @UseGuards(JwtAuthGuard, MiembroBarberiaGuard)
  findAll(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
  ) {
    return this.profesionalesService.findAll(barberiaId);
  }

    @Post(':profesionalId/servicios')
    @UseGuards(AdministradorBarberiaGuard)
  asignarServicio(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    asignarServicioDto: AsignarServicioDto,
  ) {
    return this.profesionalesService.asignarServicio(
      barberiaId,
      profesionalId,
      asignarServicioDto.servicioId,
    );
  }

    @Get(':profesionalId/servicios')
  findServicios(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
  ) {
    return this.profesionalesService.findServicios(
      barberiaId,
      profesionalId,
    );
  }

    @Delete(':profesionalId/servicios/:servicioId')
    @UseGuards(AdministradorBarberiaGuard)
  @HttpCode(204)
  async quitarServicio(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
  ) {
    await this.profesionalesService.quitarServicio(
      barberiaId,
      profesionalId,
      servicioId,
    );
  }

  @Post(':profesionalId/horarios')
  @UseGuards(AdministradorBarberiaGuard)
  crearHorario(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateHorarioDto,
  ) {
    return this.profesionalesService.crearHorario(
      barberiaId,
      profesionalId,
      dto,
    );
  }

    @Get(':profesionalId/horarios')
  findHorarios(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
  ) {
    return this.profesionalesService.findHorarios(
      barberiaId,
      profesionalId,
    );
  }

  @Delete(':profesionalId/horarios/:horarioId')
  @UseGuards(AdministradorBarberiaGuard)
  @HttpCode(204)
  async eliminarHorario(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Param('horarioId', ParseIntPipe) horarioId: number,
  ) {
    await this.profesionalesService.eliminarHorario(
      barberiaId,
      profesionalId,
      horarioId,
    );
  }
}