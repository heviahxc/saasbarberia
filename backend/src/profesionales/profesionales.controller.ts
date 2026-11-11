import { ProfesionalPropioGuard } from '../auth/guards/profesional-propio.guard.js';
import { CreateBloqueoLocalDto } from './dto/create-bloqueo-local.dto.js';
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
import { CreateBloqueoDto } from './dto/create-bloqueo.dto.js';
@Controller('barberias/:barberiaId/profesionales')
@UseGuards(JwtAuthGuard, MiembroBarberiaGuard)
export class ProfesionalesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

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
    return this.profesionalesService.create(barberiaId, createProfesionalDto);
  }
  @Get()
  @UseGuards(JwtAuthGuard, MiembroBarberiaGuard)
  findAll(@Param('barberiaId', ParseIntPipe) barberiaId: number) {
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
    return this.profesionalesService.findServicios(barberiaId, profesionalId);
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
    return this.profesionalesService.findHorarios(barberiaId, profesionalId);
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

  @Post(':profesionalId/bloqueos')
  @UseGuards(ProfesionalPropioGuard)
  crearBloqueo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateBloqueoDto,
  ) {
    return this.profesionalesService.crearBloqueo(
      barberiaId,
      profesionalId,
      dto,
    );
  }

  @Get(':profesionalId/bloqueos')
  @UseGuards(ProfesionalPropioGuard)
  findBloqueos(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
  ) {
    return this.profesionalesService.findBloqueos(barberiaId, profesionalId);
  }

  @Delete(':profesionalId/bloqueos/:bloqueoId')
  @UseGuards(ProfesionalPropioGuard)
  @HttpCode(204)
  async eliminarBloqueo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Param('bloqueoId', ParseIntPipe) bloqueoId: number,
  ) {
    await this.profesionalesService.eliminarBloqueo(
      barberiaId,
      profesionalId,
      bloqueoId,
    );
  }

  @Post(':profesionalId/bloqueos/impacto')
  @UseGuards(ProfesionalPropioGuard)
  @HttpCode(200)
  consultarImpactoBloqueo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateBloqueoDto,
  ) {
    return this.profesionalesService.consultarImpactoBloqueo(
      barberiaId,
      profesionalId,
      dto,
    );
  }
  @Post(':profesionalId/bloqueos/local')
  @UseGuards(ProfesionalPropioGuard)
  crearBloqueoLocal(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: CreateBloqueoLocalDto,
  ) {
    return this.profesionalesService.crearBloqueoLocal(
      barberiaId,
      profesionalId,
      dto,
    );
  }

  @Post(':profesionalId/bloqueos/local/impacto')
  @UseGuards(ProfesionalPropioGuard)
  @HttpCode(200)
  consultarImpactoLocal(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: CreateBloqueoLocalDto,
  ) {
    return this.profesionalesService.consultarImpactoBloqueoLocal(
      barberiaId,
      profesionalId,
      dto,
    );
  }

  @Post(':profesionalId/bloqueos/local/pendiente')
  @UseGuards(ProfesionalPropioGuard)
  crearBloqueoPendiente(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('profesionalId', ParseIntPipe) profesionalId: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: CreateBloqueoLocalDto,
  ) {
    return this.profesionalesService.crearBloqueoLocal(
      barberiaId,
      profesionalId,
      dto,
      true,
    );
  }
}
