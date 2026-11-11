import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MiembroBarberiaGuard } from '../auth/guards/miembro-barberia.guard.js';
import { AdministradorBarberiaGuard } from '../auth/guards/administrador-barberia.guard.js';
import type { RequestAutenticada } from '../auth/types/request-autenticada.type.js';
import { EquipoService } from './equipo.service.js';
import {
  CrearInvitacionDto,
  TokenInvitacionDto,
} from './dto/invitacion-equipo.dto.js';

const validar = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('barberias/:barberiaId/equipo')
@UseGuards(JwtAuthGuard, MiembroBarberiaGuard, AdministradorBarberiaGuard)
export class EquipoController {
  constructor(private readonly equipo: EquipoService) {}

  @Get()
  listar(@Param('barberiaId', ParseIntPipe) barberiaId: number) {
    return this.equipo.listar(barberiaId);
  }

  @Post('invitaciones')
  crear(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Req() req: RequestAutenticada,
    @Body(validar) dto: CrearInvitacionDto,
  ) {
    return this.equipo.crear(barberiaId, req.usuario.id, dto);
  }

  @Delete('invitaciones/:invitacionId')
  @HttpCode(204)
  revocar(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('invitacionId', ParseIntPipe) id: number,
    @Req() req: RequestAutenticada,
  ) {
    return this.equipo.revocar(barberiaId, id, req.usuario.id);
  }
}

@Controller('invitaciones')
@UseGuards(JwtAuthGuard)
export class InvitacionesController {
  constructor(private readonly equipo: EquipoService) {}

  @Post('consultar')
  @HttpCode(200)
  consultar(
    @Body(validar) dto: TokenInvitacionDto,
    @Req() req: RequestAutenticada,
  ) {
    return this.equipo.consultar(dto.token, req.usuario);
  }

  @Post('aceptar')
  @HttpCode(200)
  aceptar(
    @Body(validar) dto: TokenInvitacionDto,
    @Req() req: RequestAutenticada,
  ) {
    return this.equipo.aceptar(dto.token, req.usuario);
  }
}
