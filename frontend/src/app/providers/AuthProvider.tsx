import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { AuthContext } from '../../features/auth/auth-context.js';
import type { Sesion } from '../../features/auth/types.js';
import { escucharSesionInvalida } from '../../shared/lib/api.js';

type Props = {
  children: ReactNode;
};

export default function AuthProvider({ children }: Props) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [avisoAcceso, setAvisoAcceso] = useState('');

  const tokenActual = sesion?.accessToken;

  useEffect(() => {
    if (!tokenActual) return;

    return escucharSesionInvalida((tokenRechazado) => {
      if (tokenRechazado !== tokenActual) return;

      setSesion(null);
      setAvisoAcceso(
        'Tu sesión venció o dejó de ser válida. Inicia sesión nuevamente.',
      );
    });
  }, [tokenActual]);

  const iniciarSesion = useCallback((nuevaSesion: Sesion) => {
    setAvisoAcceso('');
    setSesion(nuevaSesion);
  }, []);

  const cerrarSesion = useCallback(() => {
    setSesion(null);
    setAvisoAcceso('');
  }, []);

  const actualizarNombre = useCallback((nombre: string) => {
    setSesion((actual) =>
      actual
        ? {
            ...actual,
            usuario: {
              ...actual.usuario,
              nombre,
            },
          }
        : actual,
    );
  }, []);

  const valor = useMemo(
    () => ({
      sesion,
      avisoAcceso,
      iniciarSesion,
      cerrarSesion,
      actualizarNombre,
    }),
    [
      sesion,
      avisoAcceso,
      iniciarSesion,
      cerrarSesion,
      actualizarNombre,
    ],
  );

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}