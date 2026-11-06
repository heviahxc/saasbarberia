import { useEffect, useState } from 'react';

import { api } from '../lib/api.js';
import EstadoContenido from './EstadoContenido.js';

type Perfil = {
  nombre: string;
  apellidoPaterno: string | null;
  telefono: string | null;
};

type Props = {
  accessToken: string;
  onCompletar: () => void;
};

export default function AvisoPerfilIncompleto({
  accessToken,
  onCompletar,
}: Props) {
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    async function comprobarPerfil() {
      setError('');
      setFaltantes([]);

      try {
        const perfil = await api<Perfil>('/auth/me', {
          token: accessToken,
          signal: controlador.signal,
        });

        const campos: string[] = [];

        if (!perfil.nombre.trim()) {
          campos.push('nombre');
        }

        if (!perfil.apellidoPaterno?.trim()) {
          campos.push('apellido paterno');
        }

        if (!perfil.telefono?.trim()) {
          campos.push('teléfono');
        }

        if (!controlador.signal.aborted) {
          setFaltantes(campos);
        }
      } catch {
        if (controlador.signal.aborted) return;

        setError(
          'No pudimos comprobar si tu perfil está completo.',
        );
      }
    }

    void comprobarPerfil();

    return () => controlador.abort();
  }, [accessToken, intento]);

  if (error) {
    return (
      <EstadoContenido
        tipo="error"
        mensaje={error}
        onReintentar={() => setIntento((actual) => actual + 1)}
      />
    );
  }

  if (faltantes.length === 0) {
    return null;
  }

  return (
    <aside
      className="aviso-perfil"
      aria-labelledby="titulo-aviso-perfil"
    >
      <div>
        <h2 id="titulo-aviso-perfil">Completa tu perfil</h2>

        <p role="status">
          Para crear nuevas reservas necesitas completar:
          {' '}
          {faltantes.join(', ')}.
        </p>

        <p>
          Puedes seguir consultando y gestionando tus reservas
          existentes.
        </p>
      </div>

      <button type="button" onClick={onCompletar}>
        Completar mis datos
      </button>
    </aside>
  );
}