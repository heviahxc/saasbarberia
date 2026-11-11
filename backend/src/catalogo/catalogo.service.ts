import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /barberias hace que un usuario obtenga todas las barberías disponibles.
  // GET /barberias/:barberiaId/servicios hace que un usuario obtenga todos los servicios activos de una barbería específica.
  // GET /barberias/:barberiaId/servicios/:servicioId/profesionales hace que un usuario obtenga todos los profesionales que ofrecen un servicio específico en una barbería específica.
  async findBarberias() {
    return this.prisma.barberia.findMany({
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        direccion: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

    async findServicios(barberiaId: number) {
    const barberia = await this.prisma.barberia.findUnique({
      where: {
        id: barberiaId,
      },
      select: {
        id: true,
      },
    });

    if (!barberia) {
      throw new NotFoundException(
        'La barbería no existe',
      );
    }

    return this.prisma.servicio.findMany({
      where: {
        barberiaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        duracionMinutos: true,
        precio: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

    async findProfesionales(
    barberiaId: number,
    servicioId: number,
  ) {
    const servicio = await this.prisma.servicio.findFirst({
      where: {
        id: servicioId,
        barberiaId,
        activo: true,
      },
      select: {
        id: true,
      },
    });

    if (!servicio) {
      throw new NotFoundException(
        'El servicio no está disponible en esta barbería',
      );
    }

    return this.prisma.profesional.findMany({
      where: {
        barberiaId,
        activo: true,
        servicios: {
          some: {
            barberiaId,
            servicioId,
          },
        },
      },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }
}