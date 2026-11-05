import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type {
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import type {
  RequestAutenticada,
} from '../types/request-autenticada.type.js';

@Injectable()
export class AdministradorBarberiaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestAutenticada>();

    const membresia = request.membresia;
    const barberiaId = Number(request.params.barberiaId);

    if (
      !membresia ||
      membresia.barberiaId !== barberiaId ||
      membresia.rol !== 'ADMINISTRADOR'
    ) {
      throw new ForbiddenException(
        'Esta operación requiere ser administrador de la barbería',
      );
    }

    return true;
  }
}