import {
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
import { MiembroBarberiaGuard } from '../auth/guards/miembro-barberia.guard.js';
import { ConsultarAgendaDto } from './dto/consultar-agenda.dto.js';
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

   
}