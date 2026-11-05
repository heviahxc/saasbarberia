import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CatalogoService } from './catalogo.service.js';

@Controller('catalogo')
@UseGuards(JwtAuthGuard)
export class CatalogoController {
  constructor(
    private readonly catalogoService: CatalogoService,
  ) {}
  // GET /catalogo/barberias hace que un usuario autenticado obtenga todas las barberías disponibles.
  // GET /catalogo/barberias/:barberiaId/servicios hace que un usuario autenticado obtenga todos los servicios activos de una barbería específica.
  // GET /catalogo/barberias/:barberiaId/servicios/:servicioId/profesionales hace que un usuario autenticado obtenga todos los profesionales que ofrecen un servicio específico en una barbería específica.
  @Get('barberias')
  findBarberias() {
    return this.catalogoService.findBarberias();
  }

    @Get('barberias/:barberiaId/servicios')
  findServicios(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
  ) {
    return this.catalogoService.findServicios(barberiaId);
  }

    @Get('barberias/:barberiaId/servicios/:servicioId/profesionales')
  findProfesionales(
    @Param('barberiaId', ParseIntPipe) barberiaId: number,
    @Param('servicioId', ParseIntPipe) servicioId: number,
  ) {
    return this.catalogoService.findProfesionales(
      barberiaId,
      servicioId,
    );
  }
}