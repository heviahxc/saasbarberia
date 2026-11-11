import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
  Patch,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type {
  RequestAutenticada,
} from '../auth/types/request-autenticada.type.js';
import { CancelarReservaEquipoDto } from './dto/cancelar-reserva-equipo.dto.js';
import { CreateReservaDto } from './dto/create-reserva.dto.js';
import { ReservasService } from './reservas.service.js';
import { ConsultarAgendaDto } from './dto/consultar-agenda.dto.js';
import { MiembroBarberiaGuard } from '../auth/guards/miembro-barberia.guard.js';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto.js';
import { AdministradorBarberiaGuard } from '../auth/guards/administrador-barberia.guard.js';
import { ReagendarReservaEquipoDto } from './dto/reagendar-reserva-equipo.dto.js';
@Controller('barberias/:barberiaId/reservas')
@UseGuards(JwtAuthGuard)
export class ReservasController {
  constructor(
    private readonly reservasService: ReservasService,
  ) {}

  @Post()
  create(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Req() request: RequestAutenticada,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateReservaDto,
  ) {
    return this.reservasService.create(
      barberiaId,
      request.usuario.id,
      dto,
    );
  }

   @Get()
  @UseGuards(MiembroBarberiaGuard)
  findAgenda(
    @Req() request: RequestAutenticada,
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ConsultarAgendaDto,
  ) {
    return this.reservasService.findAgenda(
      barberiaId,
      query.fecha,
      request.membresia?.rol === 'ADMINISTRADOR' ? undefined : (request.membresia?.profesionalId ?? 0),
    );
  }

    @Get('disponibilidad')
  findDisponibilidad(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ConsultarDisponibilidadDto,
  ) {
    return this.reservasService.findDisponibilidad(
      barberiaId,
      query,
    );
  }

    @Patch(':reservaId/cancelar')
  @UseGuards(MiembroBarberiaGuard)
  cancelarDesdeEquipo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Req() request: RequestAutenticada,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CancelarReservaEquipoDto,
  ) {
    return this.reservasService.cancelarDesdeEquipo(
      barberiaId,
      reservaId,
      request.usuario.id,
      dto.motivo,
    );
  }
  @Get(':reservaId/disponibilidad')
  @UseGuards(MiembroBarberiaGuard)
  findDisponibilidadReagendarEquipo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Req() request: RequestAutenticada,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ConsultarAgendaDto,
  ) {
    return this.reservasService.findDisponibilidadReagendarEquipo(
      barberiaId,
      reservaId,
      request.usuario.id,
      query.fecha,
    );
  }

  @Patch(':reservaId/reagendar')
  @UseGuards(MiembroBarberiaGuard)
  reagendarDesdeEquipo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Req() request: RequestAutenticada,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: ReagendarReservaEquipoDto,
  ) {
    return this.reservasService.reagendarDesdeEquipo(
      barberiaId,
      reservaId,
      request.usuario.id,
      dto.inicio,
      dto.motivo,
    );
  }
    @Get(':reservaId/historial')
  @UseGuards(
    MiembroBarberiaGuard,
    AdministradorBarberiaGuard,
  )
  findHistorialAdministrativo(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
  ) {
    return this.reservasService.findHistorialAdministrativo(
      barberiaId,
      reservaId,
    );
  }
}