import { Injectable, ForbiddenException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { RequestAutenticada } from '../types/request-autenticada.type.js';

@Injectable()
export class ProfesionalPropioGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestAutenticada>();
    const membresia = request.membresia;
    if (membresia?.rol === 'ADMINISTRADOR') return true;
    if (
      membresia?.profesionalId &&
      membresia.profesionalId === Number(request.params.profesionalId)
    )
      return true;
    throw new ForbiddenException('Solo puedes gestionar tus propios bloqueos');
  }
}
