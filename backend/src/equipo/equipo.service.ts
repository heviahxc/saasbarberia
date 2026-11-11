import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { UsuarioAutenticado } from '../auth/types/request-autenticada.type.js';
import type { CrearInvitacionDto } from './dto/invitacion-equipo.dto.js';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class EquipoService {
  constructor(private readonly prisma: PrismaService) {}

  // Todas las modificaciones de invitaciones de un negocio usan el mismo bloqueo.
  private async bloquear(tx: Prisma.TransactionClient, barberiaId: number) {
    await tx.$queryRaw`SELECT "id" FROM "Barberia" WHERE "id" = ${barberiaId} FOR UPDATE`;
  }

  private async comprobarAdministrador(
    tx: Prisma.TransactionClient,
    barberiaId: number,
    usuarioId: number,
  ) {
    const miembro = await tx.miembroBarberia.findUnique({
      where: { usuarioId_barberiaId: { usuarioId, barberiaId } },
      include: { usuario: { select: { activo: true } } },
    });
    if (
      !miembro?.activo ||
      !miembro.usuario.activo ||
      miembro.rol !== 'ADMINISTRADOR'
    ) {
      throw new ForbiddenException(
        'Solo un administrador activo puede gestionar el equipo',
      );
    }
  }

  async listar(barberiaId: number) {
    const profesionales = await this.prisma.profesional.findMany({
      where: { barberiaId },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        activo: true,
        miembros: {
          select: {
            activo: true,
            usuario: { select: { nombre: true, email: true } },
          },
        },
      },
    });
    const invitaciones = await this.prisma.invitacionEquipo.findMany({
      where: { barberiaId },
      orderBy: { creadoEn: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        profesionalId: true,
        venceEn: true,
        aceptadaEn: true,
        revocadaEn: true,
      },
    });
    const ahora = Date.now();
    return {
      profesionales,
      invitaciones: invitaciones.map((i) => ({
        ...i,
        estado: i.aceptadaEn
          ? 'ACEPTADA'
          : i.revocadaEn
            ? 'REVOCADA'
            : i.venceEn.getTime() <= ahora
              ? 'VENCIDA'
              : 'PENDIENTE',
      })),
    };
  }

  async crear(barberiaId: number, creadorId: number, dto: CrearInvitacionDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquear(tx, barberiaId);
      await this.comprobarAdministrador(tx, barberiaId, creadorId);
      const profesional = await tx.profesional.findFirst({
        where: { id: dto.profesionalId, barberiaId, activo: true },
      });
      if (!profesional)
        throw new NotFoundException(
          'El profesional no está activo en esta barbería',
        );
      const vinculo = await tx.miembroBarberia.findFirst({
        where: { barberiaId, profesionalId: dto.profesionalId },
      });
      const miembro = await tx.miembroBarberia.findFirst({
        where: { barberiaId, usuario: { email: dto.email } },
      });
      if (vinculo || miembro)
        throw new ConflictException(
          'El profesional o la cuenta ya tienen una membresía en este negocio',
        );
      const ahora = new Date();
      // Una nueva invitación reemplaza los enlaces anteriores para esa persona o profesional.
      await tx.invitacionEquipo.updateMany({
        where: {
          barberiaId,
          aceptadaEn: null,
          revocadaEn: null,
          OR: [{ profesionalId: dto.profesionalId }, { email: dto.email }],
        },
        data: { revocadaEn: ahora },
      });
      const token = randomBytes(32).toString('hex');
      const invitacion = await tx.invitacionEquipo.create({
        data: {
          barberiaId,
          profesionalId: dto.profesionalId,
          email: dto.email,
          creadorId,
          tokenHash: hashToken(token),
          venceEn: new Date(ahora.getTime() + 72 * 60 * 60 * 1000),
        },
        select: { id: true, email: true, venceEn: true },
      });
      return { ...invitacion, token };
    });
  }

  async revocar(barberiaId: number, id: number, usuarioId: number) {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
      throw new BadRequestException('El ID de invitación no es válido');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.bloquear(tx, barberiaId);
      await this.comprobarAdministrador(tx, barberiaId, usuarioId);
      const invitacion = await tx.invitacionEquipo.findFirst({
        where: { id, barberiaId },
      });
      if (!invitacion) throw new NotFoundException('La invitación no existe');
      if (invitacion.aceptadaEn)
        throw new ConflictException('La invitación ya fue aceptada');
      await tx.invitacionEquipo.update({
        where: { id },
        data: { revocadaEn: invitacion.revocadaEn ?? new Date() },
      });
    });
  }

  private async comprobarInvitacion(
    tx: Prisma.TransactionClient,
    token: string,
    usuario: UsuarioAutenticado,
  ) {
    const invitacion = await tx.invitacionEquipo.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        profesional: { include: { barberia: { select: { nombre: true } } } },
      },
    });
    if (!invitacion) throw new NotFoundException('La invitación no existe');
    if (invitacion.email !== usuario.email.trim().toLowerCase()) {
      throw new ForbiddenException(
        'Inicia sesión con el correo al que se envió esta invitación',
      );
    }
    if (
      invitacion.aceptadaEn ||
      invitacion.revocadaEn ||
      invitacion.venceEn <= new Date()
    ) {
      throw new GoneException(
        'Esta invitación ya fue utilizada, revocada o venció',
      );
    }
    if (!invitacion.profesional.activo)
      throw new ConflictException('El profesional ya no está activo');
    await this.comprobarAdministrador(
      tx,
      invitacion.barberiaId,
      invitacion.creadorId,
    );
    return invitacion;
  }

  async consultar(token: string, usuario: UsuarioAutenticado) {
    return this.prisma.$transaction(async (tx) => {
      const i = await this.comprobarInvitacion(tx, token, usuario);
      return {
        barberia: i.profesional.barberia.nombre,
        profesional: i.profesional.nombre,
        email: i.email,
        venceEn: i.venceEn,
      };
    });
  }

  async aceptar(token: string, usuario: UsuarioAutenticado) {
    const referencia = await this.prisma.invitacionEquipo.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { barberiaId: true },
    });
    if (!referencia) throw new NotFoundException('La invitación no existe');
    return this.prisma.$transaction(async (tx) => {
      await this.bloquear(tx, referencia.barberiaId);
      const i = await this.comprobarInvitacion(tx, token, usuario);
      const existente = await tx.miembroBarberia.findFirst({
        where: {
          barberiaId: i.barberiaId,
          OR: [{ usuarioId: usuario.id }, { profesionalId: i.profesionalId }],
        },
      });
      if (existente)
        throw new ConflictException(
          'La cuenta o el profesional ya tienen una membresía. Contacta al administrador',
        );
      await tx.miembroBarberia.create({
        data: {
          usuarioId: usuario.id,
          barberiaId: i.barberiaId,
          profesionalId: i.profesionalId,
          rol: 'MIEMBRO',
        },
      });
      await tx.invitacionEquipo.update({
        where: { id: i.id },
        data: { aceptadaEn: new Date(), aceptadaPorId: usuario.id },
      });
      return {
        barberiaId: i.barberiaId,
        profesionalId: i.profesionalId,
        rol: 'MIEMBRO',
      };
    });
  }
}
