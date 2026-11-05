
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBarberiaDto } from './dto/create-barberia.dto.js';

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
        miembros: {
          create: {
            usuarioId,
            rol: 'ADMINISTRADOR',
          },
        },
      },
    });
  }
}
