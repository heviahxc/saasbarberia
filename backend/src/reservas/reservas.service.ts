import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import type { Reserva } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReservaDto } from './dto/create-reserva.dto.js';
import { calcularIntervalo } from './utils/calcular-intervalo.js';
import { DateTime, IANAZone } from 'luxon';
import { ConsultarDisponibilidadDto } from './dto/consultar-disponibilidad.dto.js';
import { generarInicios } from './utils/generar-inicios.js';

import { intervalosSeSuperponen } from './utils/intervalos-se-superponen.js';

type ServicioReservable = {
  nombre: string;
  duracionMinutos: number;
  precio: string;
  zonaHoraria: string;
  intervaloReservasMinutos: number;
};

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(barberiaId: number, clienteId: number, dto: CreateReservaDto) {
    if (
      !Number.isInteger(barberiaId) ||
      barberiaId < 1 ||
      barberiaId > 2147483647
    ) {
      throw new BadRequestException('El ID de barbería no es válido');
    }
    const cliente = await this.prisma.usuario.findUnique({
      where: {
        id: clienteId,
      },
      select: {
        nombre: true,
        apellidoPaterno: true,
        telefono: true,
      },
    });

    const perfilCompleto =
      cliente !== null &&
      Boolean(cliente.nombre.trim()) &&
      Boolean(cliente.apellidoPaterno?.trim()) &&
      Boolean(cliente.telefono?.trim());

    if (!perfilCompleto) {
      throw new ForbiddenException(
        'Completa tu nombre, apellido paterno y teléfono en Mi perfil antes de reservar.',
      );
    }
    return this.prisma.$transaction(
      async (tx) => {
        // El mismo bloqueo que utiliza eliminarHorario().
        const profesionales = await tx.$queryRaw<
          { id: number; activo: boolean }[]
        >`
          SELECT "id", "activo"
          FROM "public"."Profesional"
          WHERE "id" = ${dto.profesionalId}
            AND "barberiaId" = ${barberiaId}
          FOR UPDATE
        `;

        if (!profesionales[0]?.activo) {
          throw new NotFoundException(
            'El profesional no está disponible en esta barbería',
          );
        }

        // Comprobar servicio y asignación, manteniéndolos
        // estables hasta terminar la transacción.
        const servicios = await tx.$queryRaw<ServicioReservable[]>`
          SELECT
            s."nombre",
            s."duracionMinutos",
            s."precio"::text AS "precio",
            b."zonaHoraria",
            b."intervaloReservasMinutos"
          FROM "public"."Servicio" AS s
          JOIN "public"."Barberia" AS b
            ON b."id" = s."barberiaId"
          JOIN "public"."ProfesionalServicio" AS ps
            ON ps."servicioId" = s."id"
            AND ps."barberiaId" = s."barberiaId"
          WHERE s."id" = ${dto.servicioId}
            AND s."barberiaId" = ${barberiaId}
            AND s."activo" = true
            AND ps."profesionalId" = ${dto.profesionalId}
          FOR SHARE OF s, b, ps
        `;

        const servicio = servicios[0];

        if (!servicio) {
          throw new NotFoundException(
            'El servicio no está disponible para este profesional',
          );
        }

        const intervalo = calcularIntervalo(
          dto.inicio,
          servicio.duracionMinutos,
          servicio.zonaHoraria,
          servicio.intervaloReservasMinutos,
        );

        const horario = await tx.horarioProfesional.findFirst({
          where: {
            barberiaId,
            profesionalId: dto.profesionalId,
            diaSemana: intervalo.diaSemana,
            inicioMinuto: {
              lte: intervalo.inicioMinuto,
            },
            finMinuto: {
              gte: intervalo.finMinuto,
            },
          },
          select: {
            id: true,
          },
        });

        if (!horario) {
          throw new ConflictException(
            'El servicio completo no cabe en la jornada del profesional',
          );
        }
        const bloqueo = await tx.bloqueoProfesional.findFirst({
          where: {
            barberiaId,
            profesionalId: dto.profesionalId,
            inicio: {
              lt: intervalo.fin,
            },
            fin: {
              gt: intervalo.inicio,
            },
          },
          select: {
            id: true,
          },
        });

        if (bloqueo) {
          throw new ConflictException(
            'El profesional no está disponible en ese intervalo',
          );
        }
        // Strings ISO con zona explícita para PostgreSQL.
        const inicioISO = intervalo.inicio.toISOString();
        const finISO = intervalo.fin.toISOString();

        const reservas = await tx.$queryRaw<Reserva[]>`
          INSERT INTO "public"."Reserva" (
            "clienteId",
            "barberiaId",
            "profesionalId",
            "servicioId",
            "inicio",
            "fin",
            "duracionMinutos",
            "precioAcordado",
            "nombreServicio",
            "zonaHoraria"
          )
          VALUES (
            ${clienteId},
            ${barberiaId},
            ${dto.profesionalId},
            ${dto.servicioId},
            ${inicioISO}::timestamptz,
            ${finISO}::timestamptz,
            ${servicio.duracionMinutos},
            ${servicio.precio}::numeric,
            ${servicio.nombre},
            ${servicio.zonaHoraria}
          )
          ON CONFLICT DO NOTHING
          RETURNING *
        `;

        const reserva = reservas[0];

        if (!reserva) {
          throw new ConflictException(
            'Ese horario ya está ocupado. Elige otro horario',
          );
        }

        return reserva;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }

  async findMias(clienteId: number) {
    return this.prisma.reserva.findMany({
      where: {
        clienteId,
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        duracionMinutos: true,
        precioAcordado: true,
        nombreServicio: true,
        zonaHoraria: true,
        estado: true,
        creadoEn: true,
        canceladoEn: true,
        barberia: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            direccion: true,
          },
        },
        profesional: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: [{ inicio: 'desc' }, { id: 'desc' }],
    });
  }

  async cancelarMia(reservaId: number, clienteId: number) {
    if (
      !Number.isInteger(reservaId) ||
      reservaId < 1 ||
      reservaId > 2147483647
    ) {
      throw new BadRequestException('El ID de reserva no es válido');
    }

    const canceladas = await this.prisma.$queryRaw<
      Pick<Reserva, 'id' | 'estado' | 'canceladoEn'>[]
    >`
      UPDATE "public"."Reserva"
      SET
        "estado" = 'CANCELADA',
        "canceladoEn" = clock_timestamp()
      WHERE "id" = ${reservaId}
        AND "clienteId" = ${clienteId}
        AND "estado" = 'CONFIRMADA'
        AND "inicio" > clock_timestamp()
      RETURNING "id", "estado", "canceladoEn"
    `;

    const cancelada = canceladas[0];

    if (cancelada) {
      return cancelada;
    }

    const reserva = await this.prisma.reserva.findFirst({
      where: {
        id: reservaId,
        clienteId,
      },
      select: {
        id: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('La reserva no existe');
    }

    throw new ConflictException(
      'La reserva ya está cancelada o su hora de inicio ya pasó',
    );
  }

  async findAgenda(barberiaId: number, fecha: string, profesionalId?: number) {
    const barberia = await this.prisma.barberia.findUnique({
      where: {
        id: barberiaId,
      },
      select: {
        zonaHoraria: true,
      },
    });

    if (!barberia) {
      throw new NotFoundException('La barbería no existe');
    }

    if (!IANAZone.isValidZone(barberia.zonaHoraria)) {
      throw new InternalServerErrorException(
        'La barbería no tiene una zona horaria válida',
      );
    }

    const dia = DateTime.fromISO(fecha, {
      zone: barberia.zonaHoraria,
    });

    if (!dia.isValid || dia.toISODate() !== fecha) {
      throw new BadRequestException('La fecha no es válida');
    }

    const inicioDia = dia.startOf('day');
    const siguienteDia = inicioDia.plus({ days: 1 }).startOf('day');

    const reservas = await this.prisma.reserva.findMany({
      where: {
        barberiaId,
        profesionalId,
        inicio: {
          gte: inicioDia.toJSDate(),
          lt: siguienteDia.toJSDate(),
        },
      },
      select: {
        id: true,
        inicio: true,
        fin: true,
        nombreServicio: true,
        duracionMinutos: true,
        precioAcordado: true,
        estado: true,
        canceladoEn: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        profesional: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
    });

    return {
      fecha,
      zonaHoraria: barberia.zonaHoraria,
      reservas,
    };
  }

  async findDisponibilidad(
    barberiaId: number,
    query: ConsultarDisponibilidadDto,
  ) {
    if (
      !Number.isInteger(barberiaId) ||
      barberiaId < 1 ||
      barberiaId > 2147483647
    ) {
      throw new BadRequestException('El ID de barbería no es válido');
    }

    const profesional = await this.prisma.profesional.findFirst({
      where: {
        id: query.profesionalId,
        barberiaId,
        activo: true,
      },
      select: {
        id: true,
        barberia: {
          select: {
            zonaHoraria: true,
            intervaloReservasMinutos: true,
          },
        },
      },
    });

    if (!profesional) {
      throw new NotFoundException(
        'El profesional no está disponible en esta barbería',
      );
    }

    const servicio = await this.prisma.servicio.findFirst({
      where: {
        id: query.servicioId,
        barberiaId,
        activo: true,
        profesionales: {
          some: {
            barberiaId,
            profesionalId: query.profesionalId,
          },
        },
      },
      select: {
        duracionMinutos: true,
      },
    });

    if (!servicio) {
      throw new NotFoundException(
        'El servicio no está disponible para este profesional',
      );
    }

    const zonaHoraria = profesional.barberia.zonaHoraria;

    if (!IANAZone.isValidZone(zonaHoraria)) {
      throw new InternalServerErrorException(
        'La barbería no tiene una zona horaria válida',
      );
    }

    if (
      !Number.isInteger(servicio.duracionMinutos) ||
      servicio.duracionMinutos < 1 ||
      servicio.duracionMinutos > 1440
    ) {
      throw new ConflictException('El servicio no tiene una duración válida');
    }

    const dia = DateTime.fromISO(query.fecha, {
      zone: zonaHoraria,
    });

    if (!dia.isValid || dia.toISODate() !== query.fecha) {
      throw new BadRequestException('La fecha no es válida');
    }

    const tramos = await this.prisma.horarioProfesional.findMany({
      where: {
        barberiaId,
        profesionalId: query.profesionalId,
        diaSemana: dia.weekday,
      },
      select: {
        inicioMinuto: true,
        finMinuto: true,
      },
      orderBy: {
        inicioMinuto: 'asc',
      },
    });

    const opciones = generarInicios(
      query.fecha,
      zonaHoraria,
      servicio.duracionMinutos,
      tramos,
      Date.now(),
      profesional.barberia.intervaloReservasMinutos,
    );

    const inicioDia = dia.startOf('day');
    const siguienteDia = inicioDia.plus({ days: 1 }).startOf('day');

    const reservas = await this.prisma.reserva.findMany({
      where: {
        barberiaId,
        profesionalId: query.profesionalId,
        estado: 'CONFIRMADA',
        inicio: {
          lt: siguienteDia.toJSDate(),
        },
        fin: {
          gt: inicioDia.toJSDate(),
        },
      },
      select: {
        inicio: true,
        fin: true,
      },
    });
    const bloqueos = await this.prisma.bloqueoProfesional.findMany({
      where: {
        barberiaId,
        profesionalId: query.profesionalId,
        inicio: {
          lt: siguienteDia.toJSDate(),
        },
        fin: {
          gt: inicioDia.toJSDate(),
        },
      },
      select: {
        inicio: true,
        fin: true,
      },
    });
    const intervalosOcupados = [...reservas, ...bloqueos];

    const disponibles = opciones.filter((opcion) => {
      const inicio = Date.parse(opcion.inicio);
      const fin = Date.parse(opcion.fin);

      return !intervalosOcupados.some((ocupado) =>
        intervalosSeSuperponen(
          inicio,
          fin,
          ocupado.inicio.getTime(),
          ocupado.fin.getTime(),
        ),
      );
    });

    return {
      fecha: query.fecha,
      zonaHoraria,
      profesionalId: query.profesionalId,
      servicioId: query.servicioId,
      duracionMinutos: servicio.duracionMinutos,
      opciones: disponibles,
    };
  }

  async reagendarMia(
    reservaId: number,
    clienteId: number,
    nuevoInicio: string,
  ) {
    if (
      !Number.isInteger(reservaId) ||
      reservaId < 1 ||
      reservaId > 2147483647
    ) {
      throw new BadRequestException('El ID de reserva no es válido');
    }

    // Esta lectura identifica qué profesional debemos bloquear.
    const referencia = await this.prisma.reserva.findFirst({
      where: {
        id: reservaId,
        clienteId,
      },
      select: {
        profesionalId: true,
        barberiaId: true,
      },
    });

    if (!referencia) {
      throw new NotFoundException('La reserva no existe');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Mantener el mismo orden: profesional y después reserva.
        const profesionales = await tx.$queryRaw<
          { activo: boolean; zonaHoraria: string; intervaloReservasMinutos: number }[]
        >`
          SELECT p."activo", b."zonaHoraria", b."intervaloReservasMinutos"
          FROM "public"."Profesional" AS p
          JOIN "public"."Barberia" AS b
            ON b."id" = p."barberiaId"
          WHERE p."id" = ${referencia.profesionalId}
            AND p."barberiaId" = ${referencia.barberiaId}
          FOR UPDATE OF p
          FOR SHARE OF b
        `;

        const profesional = profesionales[0];

        if (!profesional?.activo) {
          throw new ConflictException('El profesional ya no está disponible');
        }

        // Releer y bloquear la reserva, coordinando también
        // con una posible cancelación simultánea.
        const filas = await tx.$queryRaw<Reserva[]>`
          SELECT *
          FROM "public"."Reserva"
          WHERE "id" = ${reservaId}
            AND "clienteId" = ${clienteId}
          FOR UPDATE
        `;

        const reserva = filas[0];

        if (!reserva) {
          throw new NotFoundException('La reserva no existe');
        }

        if (
          reserva.profesionalId !== referencia.profesionalId ||
          reserva.barberiaId !== referencia.barberiaId
        ) {
          throw new ConflictException(
            'La reserva cambió. Vuelve a consultarla',
          );
        }

        if (
          reserva.estado !== 'CONFIRMADA' ||
          reserva.inicio.getTime() <= Date.now()
        ) {
          throw new ConflictException(
            'Solo puedes reagendar reservas confirmadas que no hayan comenzado',
          );
        }

        const servicios = await tx.$queryRaw<{ id: number }[]>`
          SELECT s."id"
          FROM "public"."Servicio" AS s
          JOIN "public"."ProfesionalServicio" AS ps
            ON ps."servicioId" = s."id"
            AND ps."barberiaId" = s."barberiaId"
          WHERE s."id" = ${reserva.servicioId}
            AND s."barberiaId" = ${reserva.barberiaId}
            AND s."activo" = true
            AND ps."profesionalId" = ${reserva.profesionalId}
          FOR SHARE OF s, ps
        `;

        if (servicios.length === 0) {
          throw new ConflictException(
            'El servicio ya no está disponible para este profesional',
          );
        }

        const intervalo = calcularIntervalo(
          nuevoInicio,
          reserva.duracionMinutos,
          profesional.zonaHoraria,
          profesional.intervaloReservasMinutos,
        );

        if (intervalo.inicio.getTime() === reserva.inicio.getTime()) {
          throw new BadRequestException('Debes elegir un horario diferente');
        }

        const horario = await tx.horarioProfesional.findFirst({
          where: {
            barberiaId: reserva.barberiaId,
            profesionalId: reserva.profesionalId,
            diaSemana: intervalo.diaSemana,
            inicioMinuto: { lte: intervalo.inicioMinuto },
            finMinuto: { gte: intervalo.finMinuto },
          },
          select: { id: true },
        });

        if (!horario) {
          throw new ConflictException(
            'La cita completa no cabe en la jornada del profesional',
          );
        }

        const bloqueo = await tx.bloqueoProfesional.findFirst({
          where: {
            barberiaId: reserva.barberiaId,
            profesionalId: reserva.profesionalId,
            inicio: { lt: intervalo.fin },
            fin: { gt: intervalo.inicio },
          },
          select: { id: true },
        });

        if (bloqueo) {
          throw new ConflictException(
            'El profesional tiene un bloqueo en ese intervalo',
          );
        }

        const otraReserva = await tx.reserva.findFirst({
          where: {
            id: { not: reserva.id },
            barberiaId: reserva.barberiaId,
            profesionalId: reserva.profesionalId,
            estado: 'CONFIRMADA',
            inicio: { lt: intervalo.fin },
            fin: { gt: intervalo.inicio },
          },
          select: { id: true },
        });

        if (otraReserva) {
          throw new ConflictException('El nuevo horario ya está ocupado');
        }

        const actualizada = await tx.reserva.update({
          where: {
            id: reserva.id,
          },
          data: {
            inicio: intervalo.inicio,
            fin: intervalo.fin,
            zonaHoraria: profesional.zonaHoraria,
          },
        });

        await tx.reagendamientoReserva.create({
          data: {
            reservaId: reserva.id,
            actorId: clienteId,
            inicioAnterior: reserva.inicio,
            finAnterior: reserva.fin,
            inicioNuevo: intervalo.inicio,
            finNuevo: intervalo.fin,
          },
        });

        return actualizada;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }

  async findDisponibilidadReagendar(
    reservaId: number,
    clienteId: number,
    fecha: string,
  ) {
    if (
      !Number.isInteger(reservaId) ||
      reservaId < 1 ||
      reservaId > 2147483647
    ) {
      throw new BadRequestException('El ID de reserva no es válido');
    }

    const reserva = await this.prisma.reserva.findFirst({
      where: {
        id: reservaId,
        clienteId,
      },
      select: {
        id: true,
        barberiaId: true,
        profesionalId: true,
        servicioId: true,
        inicio: true,
        estado: true,
        duracionMinutos: true,
        profesional: {
          select: {
            activo: true,
          },
        },
        barberia: {
          select: {
            zonaHoraria: true,
            intervaloReservasMinutos: true,
          },
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('La reserva no existe');
    }

    if (
      reserva.estado !== 'CONFIRMADA' ||
      reserva.inicio.getTime() <= Date.now()
    ) {
      throw new ConflictException(
        'Solo puedes reagendar reservas confirmadas que no hayan comenzado',
      );
    }

    if (!reserva.profesional.activo) {
      throw new ConflictException('El profesional ya no está disponible');
    }

    const servicio = await this.prisma.servicio.findFirst({
      where: {
        id: reserva.servicioId,
        barberiaId: reserva.barberiaId,
        activo: true,
        profesionales: {
          some: {
            barberiaId: reserva.barberiaId,
            profesionalId: reserva.profesionalId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!servicio) {
      throw new ConflictException(
        'El servicio ya no está disponible para este profesional',
      );
    }

    const zonaHoraria = reserva.barberia.zonaHoraria;

    if (!IANAZone.isValidZone(zonaHoraria)) {
      throw new InternalServerErrorException(
        'La barbería no tiene una zona horaria válida',
      );
    }

    const dia = DateTime.fromISO(fecha, {
      zone: zonaHoraria,
    });

    if (!dia.isValid || dia.toISODate() !== fecha) {
      throw new BadRequestException('La fecha no es válida');
    }

    const tramos = await this.prisma.horarioProfesional.findMany({
      where: {
        barberiaId: reserva.barberiaId,
        profesionalId: reserva.profesionalId,
        diaSemana: dia.weekday,
      },
      select: {
        inicioMinuto: true,
        finMinuto: true,
      },
      orderBy: {
        inicioMinuto: 'asc',
      },
    });

    const opciones = generarInicios(
      fecha,
      zonaHoraria,
      reserva.duracionMinutos,
      tramos,
      Date.now(),
      reserva.barberia.intervaloReservasMinutos,
    );

    const inicioDia = dia.startOf('day');
    const siguienteDia = inicioDia.plus({ days: 1 }).startOf('day');

    const filtroIntervalo = {
      barberiaId: reserva.barberiaId,
      profesionalId: reserva.profesionalId,
      inicio: {
        lt: siguienteDia.toJSDate(),
      },
      fin: {
        gt: inicioDia.toJSDate(),
      },
    };

    const [otrasReservas, bloqueos] = await Promise.all([
      this.prisma.reserva.findMany({
        where: {
          ...filtroIntervalo,
          id: { not: reserva.id },
          estado: 'CONFIRMADA',
        },
        select: {
          inicio: true,
          fin: true,
        },
      }),
      this.prisma.bloqueoProfesional.findMany({
        where: filtroIntervalo,
        select: {
          inicio: true,
          fin: true,
        },
      }),
    ]);

    const ocupados = [...otrasReservas, ...bloqueos];

    const disponibles = opciones.filter((opcion) => {
      const inicio = Date.parse(opcion.inicio);
      const fin = Date.parse(opcion.fin);

      // No ofrecer el horario actual como un cambio.
      if (inicio === reserva.inicio.getTime()) {
        return false;
      }

      return !ocupados.some((ocupado) =>
        intervalosSeSuperponen(
          inicio,
          fin,
          ocupado.inicio.getTime(),
          ocupado.fin.getTime(),
        ),
      );
    });

    return {
      reservaId: reserva.id,
      inicioActual: reserva.inicio,
      fecha,
      zonaHoraria,
      duracionMinutos: reserva.duracionMinutos,
      opciones: disponibles,
    };
  }

  async findHistorialMio(reservaId: number, clienteId: number) {
    if (
      !Number.isInteger(reservaId) ||
      reservaId < 1 ||
      reservaId > 2147483647
    ) {
      throw new BadRequestException('El ID de reserva no es válido');
    }

    const reserva = await this.prisma.reserva.findFirst({
      where: {
        id: reservaId,
        clienteId,
      },
      select: {
        id: true,
        nombreServicio: true,
        estado: true,
        inicio: true,
        fin: true,
        zonaHoraria: true,
        reagendamientos: {
          select: {
            id: true,
            inicioAnterior: true,
            finAnterior: true,
            inicioNuevo: true,
            finNuevo: true,
            creadoEn: true,
          },
          orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('La reserva no existe');
    }

    return reserva;
  }

  async findHistorialAdministrativo(barberiaId: number, reservaId: number) {
    if (
      !Number.isInteger(reservaId) ||
      reservaId < 1 ||
      reservaId > 2147483647
    ) {
      throw new BadRequestException('El ID de reserva no es válido');
    }

    const reserva = await this.prisma.reserva.findFirst({
      where: {
        id: reservaId,
        barberiaId,
      },
      select: {
        id: true,
        nombreServicio: true,
        estado: true,
        inicio: true,
        fin: true,
        zonaHoraria: true,
        canceladoEn: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
        profesional: {
          select: {
            id: true,
            nombre: true,
          },
        },
        reagendamientos: {
          select: {
            id: true,
            inicioAnterior: true,
            finAnterior: true,
            inicioNuevo: true,
            finNuevo: true,
            creadoEn: true,
            actor: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('La reserva no existe en esta barbería');
    }

    return reserva;
  }
}
