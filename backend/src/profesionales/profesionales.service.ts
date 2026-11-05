import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProfesionalDto } from './dto/create-profesional.dto.js';
import { HorarioProfesional, Prisma } from '../generated/prisma/client.js';
import { CreateHorarioDto } from './dto/create-horario.dto.js';
@Injectable()
export class ProfesionalesService {
  constructor(private readonly prisma: PrismaService) {}

  //Creaa un nuevo profesional en la barbería especificada
  async create(barberiaId: number, createProfesionalDto: CreateProfesionalDto) {
    const barberia = await this.prisma.barberia.findUnique({
      where: { id: barberiaId },
      select: { id: true },
    });

    if (!barberia) {
      throw new NotFoundException(
        `No existe una barbería con el ID ${barberiaId}`,
      );
    }

    return this.prisma.profesional.create({
      data: {
        nombre: createProfesionalDto.nombre.trim(),
        barberiaId,
      },
    });
  }

  //Obtiene todos los profesionales de la barbería especificada
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

    return this.prisma.profesional.findMany({
      where: { barberiaId },
      orderBy: { id: 'asc' },
    });
  }

  //Asigna un servicio a un profesional en la barbería especificada
    async asignarServicio(
    barberiaId: number,
    profesionalId: number,
    servicioId: number,
  ) {
    const profesional = await this.prisma.profesional.findUnique({
      where: {
        id_barberiaId: {
          id: profesionalId,
          barberiaId,
        },
      },
    });

    if (!profesional) {
      throw new NotFoundException(
        'El profesional no existe en esta barbería',
      );
    }

    const servicio = await this.prisma.servicio.findUnique({
      where: {
        id_barberiaId: {
          id: servicioId,
          barberiaId,
        },
      },
    });

    if (!servicio) {
      throw new NotFoundException(
        'El servicio no existe en esta barbería',
      );
    }
    if (!servicio.activo) {
      throw new ConflictException(
        'El servicio está inactivo y no admite nuevas asignaciones',
      );
    }
    try {
      
      return await this.prisma.profesionalServicio.create({
        data: {
          barberiaId,
          profesionalId,
          servicioId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Este servicio ya está asignado al profesional',
          );
        }

        if (error.code === 'P2003') {
          throw new ConflictException(
            'El profesional o el servicio cambió. Verifica los datos e intenta nuevamente',
          );
        }
      }

      throw error;
    }
  }

  //Obtiene todos los servicios asignados a un profesional en la barbería especificada
    async findServicios(
    barberiaId: number,
    profesionalId: number,
  ) {
    const profesional = await this.prisma.profesional.findUnique({
      where: {
        id_barberiaId: {
          id: profesionalId,
          barberiaId,
        },
      },
      select: { id: true },
    });

    if (!profesional) {
      throw new NotFoundException(
        'El profesional no existe en esta barbería',
      );
    }

    const asignaciones =
      await this.prisma.profesionalServicio.findMany({
        where: {
          barberiaId,
          profesionalId,
        },
        select: {
          servicio: true,
        },
        orderBy: {
          servicioId: 'asc',
        },
      });

    return asignaciones.map((asignacion) => asignacion.servicio);
  }

    async quitarServicio(
    barberiaId: number,
    profesionalId: number,
    servicioId: number,
  ) {
    const resultado =
      await this.prisma.profesionalServicio.deleteMany({
        where: {
          barberiaId,
          profesionalId,
          servicioId,
        },
      });

    if (resultado.count === 0) {
      throw new NotFoundException(
        'No existe esta asignación en la barbería indicada',
      );
    }
  }

    async crearHorario(
    barberiaId: number,
    profesionalId: number,
    dto: CreateHorarioDto,
  ) {
    if (dto.inicioMinuto >= dto.finMinuto) {
      throw new BadRequestException(
        'El inicio debe ser anterior al fin',
      );
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: {
        id_barberiaId: {
          id: profesionalId,
          barberiaId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!profesional) {
      throw new NotFoundException(
        'El profesional no existe en esta barbería',
      );
    }

    const horarios =
      await this.prisma.$queryRaw<HorarioProfesional[]>`
        INSERT INTO "public"."HorarioProfesional" (
          "barberiaId",
          "profesionalId",
          "diaSemana",
          "inicioMinuto",
          "finMinuto"
        )
        VALUES (
          ${barberiaId},
          ${profesionalId},
          ${dto.diaSemana},
          ${dto.inicioMinuto},
          ${dto.finMinuto}
        )
        ON CONFLICT DO NOTHING
        RETURNING
          "id",
          "barberiaId",
          "profesionalId",
          "diaSemana",
          "inicioMinuto",
          "finMinuto"
      `;

    const horario = horarios[0];

    if (!horario) {
      throw new ConflictException(
        'El tramo se superpone con un horario existente o ya está registrado',
      );
    }

    return horario;
  }

    async findHorarios(
    barberiaId: number,
    profesionalId: number,
  ) {
    const profesional = await this.prisma.profesional.findUnique({
      where: {
        id_barberiaId: {
          id: profesionalId,
          barberiaId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!profesional) {
      throw new NotFoundException(
        'El profesional no existe en esta barbería',
      );
    }

    return this.prisma.horarioProfesional.findMany({
      where: {
        barberiaId,
        profesionalId,
      },
      orderBy: [
        { diaSemana: 'asc' },
        { inicioMinuto: 'asc' },
      ],
    });
  }

    async eliminarHorario(
    barberiaId: number,
    profesionalId: number,
    horarioId: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const profesionales = await tx.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "public"."Profesional"
          WHERE "id" = ${profesionalId}
            AND "barberiaId" = ${barberiaId}
          FOR UPDATE
        `;

        if (profesionales.length === 0) {
          throw new NotFoundException(
            'El profesional no existe en esta barbería',
          );
        }

        const horario = await tx.horarioProfesional.findFirst({
          where: {
            id: horarioId,
            barberiaId,
            profesionalId,
          },
          select: {
            id: true,
          },
        });

        if (!horario) {
          throw new NotFoundException(
            'El tramo no existe para este profesional en esta barbería',
          );
        }

        const reservaPendiente = await tx.reserva.findFirst({
          where: {
            barberiaId,
            profesionalId,
            estado: 'CONFIRMADA',
            fin: {
              gt: new Date(),
            },
          },
          select: {
            id: true,
          },
        });

        if (reservaPendiente) {
          throw new ConflictException(
            'No puedes eliminar horarios mientras el profesional tenga reservas confirmadas pendientes o en curso',
          );
        }

        await tx.horarioProfesional.delete({
          where: {
            id: horario.id,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }
}
