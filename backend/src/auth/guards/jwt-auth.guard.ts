import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  RequestAutenticada,
} from '../types/request-autenticada.type.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestAutenticada>();

    const authorization = request.headers.authorization;
    const partes = authorization?.trim().split(/\s+/);

    if (
      !partes ||
      partes.length !== 2 ||
      partes[0].toLowerCase() !== 'bearer'
    ) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }

    let payload: { sub?: unknown };

    try {
      payload = await this.jwtService.verifyAsync<{
        sub?: unknown;
      }>(partes[1]);
    } catch {
      throw new UnauthorizedException(
        'El token es inválido o ha expirado',
      );
    }

    if (
      typeof payload.sub !== 'number' ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0
    ) {
      throw new UnauthorizedException('El token es inválido');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'La cuenta no está disponible',
      );
    }

    request.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    };

    return true;
  }
}