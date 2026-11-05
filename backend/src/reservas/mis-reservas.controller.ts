import {
    Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type {
  RequestAutenticada,
} from '../auth/types/request-autenticada.type.js';

import { ReservasService } from './reservas.service.js';
import { ConsultarAgendaDto } from './dto/consultar-agenda.dto.js';
import { ReagendarReservaDto } from './dto/reagendar-reserva.dto.js';

@Controller('reservas')
@UseGuards(JwtAuthGuard)
export class MisReservasController {
  constructor(
    private readonly reservasService: ReservasService,
  ) {}

  @Get('mias')
  findMias(@Req() request: RequestAutenticada) {
    return this.reservasService.findMias(
      request.usuario.id,
    );
  }

    @Patch(':reservaId/cancelar')
  cancelarMia(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.reservasService.cancelarMia(
      reservaId,
      request.usuario.id,
    );
  }

     @Patch(':reservaId/reagendar')
  reagendarMia(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Req() request: RequestAutenticada,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: ReagendarReservaDto,
  ) {
    return this.reservasService.reagendarMia(
      reservaId,
      request.usuario.id,
      dto.inicio,
    );
  }

    @Get(':reservaId/disponibilidad')
  findDisponibilidadReagendar(
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
    return this.reservasService.findDisponibilidadReagendar(
      reservaId,
      request.usuario.id,
      query.fecha,
    );
  }

    @Get(':reservaId/historial')
  findHistorialMio(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Req() request: RequestAutenticada,
  ) {
    return this.reservasService.findHistorialMio(
      reservaId,
      request.usuario.id,
    );
  }
}