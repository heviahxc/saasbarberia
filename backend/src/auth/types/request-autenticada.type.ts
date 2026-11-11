import type { Request } from 'express';
import type { RolBarberia } from '../../generated/prisma/client.js';
export type UsuarioAutenticado = {
  id: number;
  nombre: string;
  email: string;
};

export type RequestAutenticada = Request & {
  usuario: UsuarioAutenticado;
  membresia?: {
    barberiaId: number;
    rol: RolBarberia;
    profesionalId: number | null;
  };
};