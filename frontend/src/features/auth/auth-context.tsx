import { createContext, useContext } from 'react';

import type { Sesion } from './types.js';

export type AuthContextValue = {
  sesion: Sesion | null;
  avisoAcceso: string;
  iniciarSesion: (sesion: Sesion) => void;
  cerrarSesion: () => void;
  actualizarNombre: (nombre: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  }

  return contexto;
}