
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBarberiaDto } from './dto/create-barberia.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { ActualizarBarberiaDto } from './dto/actualizar-barberia.dto.js';
@Injectable()
export class BarberiasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

   async findAll(usuarioId: number) {
    return this.prisma.barberia.findMany({
      where: {
        miembros: {
          some: {
            usuarioId,
            activo: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const barberia = await this.prisma.barberia.findUnique({
      where: { id },
    });

    if (!barberia) {
      throw new NotFoundException(
        `No existe una barbería con el ID ${id}`,
      );
    }

    return barberia;
  }

   async create(
    createBarberiaDto: CreateBarberiaDto,
    usuarioId: number,
  ) {
    return this.prisma.barberia.create({
      data: {
        nombre: createBarberiaDto.nombre,
        ciudad: createBarberiaDto.ciudad,
        direccion: createBarberiaDto.direccion,
        miembros: {
          create: {
            usuarioId,
            rol: 'ADMINISTRADOR',
          },
        },
      },
    });
  }

  async actualizar(
  barberiaId: number,
  dto: ActualizarBarberiaDto,
) {
  try {
    return await this.prisma.barberia.update({
      where: {
        id: barberiaId,
      },
      data: {
        nombre: dto.nombre,
        ciudad: dto.ciudad,
        direccion: dto.direccion,
        intervaloReservasMinutos: dto.intervaloReservasMinutos,
      },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        direccion: true,
        zonaHoraria: true,
        intervaloReservasMinutos: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('La barbería no existe');
    }

    throw error;
  }
}
}
