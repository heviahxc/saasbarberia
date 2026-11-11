import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '../../auth/auth-context.js';
import { api } from '../../../shared/lib/api.js';

type Props = {
  barberiaId: number;
  reservaId: number;
  nombreCliente: string;
  onCancelada: () => void;
};

export default function CancelarCitaEquipo({
  barberiaId,
  reservaId,
  nombreCliente,
  onCancelada,
}: Props) {
  const { sesion } = useAuth();

  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const enCurso = useRef(false);

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sesion || enCurso.current) return;

    const motivoLimpio = motivo.trim();

    if (motivoLimpio.length < 5 || motivoLimpio.length > 300) {
      setError('El motivo debe tener entre 5 y 300 caracteres.');
      return;
    }

    enCurso.current = true;
    setGuardando(true);
    setError('');

    try {
      await api(
        `/barberias/${barberiaId}/reservas/${reservaId}/cancelar`,
        {
          method: 'PATCH',
          token: sesion.accessToken,
          body: { motivo: motivoLimpio },
        },
      );

      setAbierto(false);
      setMotivo('');
      onCancelada();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : 'No se pudo confirmar la cancelación. Actualiza la agenda para comprobar el estado.',
      );
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className="boton-secundario"
        aria-label={`Cancelar la cita de ${nombreCliente}`}
        onClick={() => {
          setError('');
          setAbierto(true);
        }}
      >
        Cancelar cita
      </button>
    );
  }

  return (
    <form
      className="cancelar-cita-equipo"
      onSubmit={(event) => void confirmar(event)}
    >
      <p>
        ¿Cancelar la cita de <strong>{nombreCliente}</strong>?
      </p>

      <p className="nota-resumen">
        Coordina primero con el cliente. Esta acción no envía un correo.
      </p>

      <label htmlFor={`motivo-cancelacion-${reservaId}`}>
        Motivo de la cancelación
      </label>

      <textarea
        id={`motivo-cancelacion-${reservaId}`}
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
        required
        minLength={5}
        maxLength={300}
        rows={3}
        disabled={guardando}
      />

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      <div className="grupo-acciones">
        <button type="submit" disabled={guardando}>
          {guardando ? 'Cancelando…' : 'Confirmar cancelación'}
        </button>

        <button
          type="button"
          className="boton-secundario"
          disabled={guardando}
          onClick={() => {
            setAbierto(false);
            setMotivo('');
            setError('');
          }}
        >
          Conservar cita
        </button>
      </div>
    </form>
  );
}