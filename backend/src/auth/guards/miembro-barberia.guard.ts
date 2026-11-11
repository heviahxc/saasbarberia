import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  RequestAutenticada,
} from '../types/request-autenticada.type.js';

@Injectable()
export class MiembroBarberiaGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestAutenticada>();

    if (!request.usuario) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }

    const parametro = request.params.barberiaId;

    if (
      typeof parametro !== 'string' ||
      !/^[1-9]\d*$/.test(parametro)
    ) {
      throw new BadRequestException('El ID de barbería no es válido');
    }

    const barberiaId = Number(parametro);

    if (
      !Number.isSafeInteger(barberiaId) ||
      barberiaId > 2147483647
    ) {
      throw new BadRequestException('El ID de barbería no es válido');
    }

    const membresia = await this.prisma.miembroBarberia.findUnique({
      where: {
        usuarioId_barberiaId: {
          usuarioId: request.usuario.id,
          barberiaId,
        },
      },
     select: {
        activo: true,
        rol: true,
        profesionalId: true,
      },
    });

    if (!membresia || !membresia.activo) {
      throw new ForbiddenException(
        'No tienes acceso a esta barbería',
      );
    }
    request.membresia = {
      barberiaId,
      rol: membresia.rol,
      profesionalId: membresia.profesionalId,
    };
    return true;
  }
}