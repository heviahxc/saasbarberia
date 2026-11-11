import { Prisma } from '../generated/prisma/client.js';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto.js';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServicioDto } from './dto/create-servicio.dto.js';

@Injectable()
export class ServiciosService {
  constructor(private readonly prisma: PrismaService) {}

  //Crea un nuevo servicio en la barbería especificada
  async create(barberiaId: number, createServicioDto: CreateServicioDto) {
    const barberia = await this.prisma.barberia.findUnique({
      where: { id: barberiaId },
      select: { id: true },
    });

    if (!barberia) {
      throw new NotFoundException(
        `No existe una barbería con el ID ${barberiaId}`,
      );
    }

    return this.prisma.servicio.create({
      data: {
        nombre: createServicioDto.nombre.trim(),
        duracionMinutos: createServicioDto.duracionMinutos,
        precio: createServicioDto.precio,
        barberiaId,
      },
    });
  }
  //Obtiene todos los servicios de la barbería especificada
  async findAll(barberiaId: number) {
    const barberia = await this.prisma.barberia.findUnique({
      where: { id: barberiaId },
      select: { id: true },
    });

    if (!barberia) {
      throw new NotFoundException(
        `No existe una barbería con el ID ${barberiaId}`,
      );
    }

    return this.prisma.servicio.findMany({
      where: { barberiaId },
      orderBy: { id: 'asc' },
    });
  }
  //Cambia el estado de un servicio en la barbería especificada
  async cambiarEstado(barberiaId: number, servicioId: number, activo: boolean) {
    this.validarServicioId(servicioId);
    const resultado = await this.prisma.servicio.updateMany({
      where: {
        id: servicioId,
        barberiaId,
      },
      data: {
        activo,
      },
    });

    if (resultado.count === 0) {
      throw new NotFoundException('El servicio no existe en esta barbería');
    }

    return {
      id: servicioId,
      barberiaId,
      activo,
    };
  }
  //Obtiene todos los servicios activos de la barbería especificada
  async findDisponibles(barberiaId: number) {
    const barberia = await this.prisma.barberia.findUnique({
      where: { id: barberiaId },
      select: { id: true },
    });

    if (!barberia) {
      throw new NotFoundException(
        `No existe una barbería con el ID ${barberiaId}`,
      );
    }

    return this.prisma.servicio.findMany({
      where: {
        barberiaId,
        activo: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async cambiarDuracion(
    barberiaId: number,
    servicioId: number,
    duracionMinutos: number,
  ) {
    this.validarServicioId(servicioId);
    const resultado = await this.prisma.servicio.updateMany({
      where: {
        id: servicioId,
        barberiaId,
      },
      data: {
        duracionMinutos,
      },
    });

    if (resultado.count === 0) {
      throw new NotFoundException('El servicio no existe en esta barbería');
    }

    return {
      id: servicioId,
      barberiaId,
      duracionMinutos,
    };
  }

  private validarServicioId(servicioId: number) {
    if (
      !Number.isSafeInteger(servicioId) ||
      servicioId < 1 ||
      servicioId > 2147483647
    ) {
      throw new BadRequestException('El ID de servicio no es válido');
    }
  }

  async actualizar(
    barberiaId: number,
    servicioId: number,
    dto: ActualizarServicioDto,
  ) {
    this.validarServicioId(servicioId);
    try {
      return await this.prisma.servicio.update({
        where: { id_barberiaId: { id: servicioId, barberiaId } },
        data: {
          nombre: dto.nombre,
          precio: dto.precio,
          duracionMinutos: dto.duracionMinutos,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('El servicio no existe en esta barbería');
      }
      throw error;
    }
  }
}
