import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '../../auth/auth-context.js';
import { api, ApiError } from '../../../shared/lib/api.js';
import { formatearFechaHora } from '../../../shared/lib/formatos.js';

type Opcion = {
  horaLocal: string;
  inicio: string;
  fin: string;
};

type Disponibilidad = {
  inicioActual: string;
  zonaHoraria: string;
  duracionMinutos: number;
  opciones: Opcion[];
};

type Resultado = {
  inicio: string;
  zonaHoraria: string;
};

type Props = {
  barberiaId: number;
  reservaId: number;
  nombreCliente: string;
  nombreServicio: string;
  onVolver: () => void;
  onReagendada: (mensaje: string) => void;
};

export default function ReagendarCitaEquipo({
  barberiaId,
  reservaId,
  nombreCliente,
  nombreServicio,
  onVolver,
  onReagendada,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;

  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [datos, setDatos] = useState<Disponibilidad | null>(null);
  const [seleccionada, setSeleccionada] = useState<Opcion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [incierto, setIncierto] = useState(false);
  const [error, setError] = useState('');

  const enCurso = useRef(false);
  const ruta = `/barberias/${barberiaId}/reservas/${reservaId}`;

  async function consultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || enCurso.current || incierto) return;

    enCurso.current = true;
    setOcupado(true);
    setError('');
    setDatos(null);
    setSeleccionada(null);

    try {
      const parametros = new URLSearchParams({ fecha });

      const respuesta = await api<Disponibilidad>(
        `${ruta}/disponibilidad?${parametros}`,
        { token },
      );

      setDatos(respuesta);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : 'No se pudieron consultar los horarios.',
      );
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !seleccionada || enCurso.current || incierto) return;

    const motivoLimpio = motivo.trim();

    if (motivoLimpio.length < 5 || motivoLimpio.length > 300) {
      setError('El motivo debe tener entre 5 y 300 caracteres.');
      return;
    }

    enCurso.current = true;
    setOcupado(true);
    setError('');

    try {
      const resultado = await api<Resultado>(`${ruta}/reagendar`, {
        method: 'PATCH',
        token,
        body: {
          inicio: seleccionada.inicio,
          motivo: motivoLimpio,
        },
      });

      onReagendada(
        `Cita reagendada para ${formatearFechaHora(
          resultado.inicio,
          resultado.zonaHoraria,
        )}. El motivo quedó registrado.`,
      );
    } catch (fallo) {
      setSeleccionada(null);
      setDatos(null);

      if (fallo instanceof ApiError && fallo.status < 500) {
        setError(fallo.message);
      } else {
        setIncierto(true);
        setError(
          'No pudimos confirmar el resultado. Vuelve a la agenda y revisa la cita antes de intentar otro cambio.',
        );
      }
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="titulo-reagendar-equipo">
      <button
        type="button"
        className="boton-secundario"
        disabled={ocupado}
        onClick={onVolver}
      >
        Volver a la agenda
      </button>

      <h2 id="titulo-reagendar-equipo">Reagendar cita</h2>

      <p>
        <strong>{nombreCliente}</strong> · {nombreServicio}
      </p>

      <p>
        Coordina el nuevo horario con el cliente. La cita actual se mantiene
        hasta confirmar el cambio. Esta acción todavía no envía un correo.
      </p>

      <form className="formulario" onSubmit={consultar}>
        <div className="campo">
          <label htmlFor="fecha-reagendar-equipo">Nueva fecha</label>
          <input
            id="fecha-reagendar-equipo"
            type="date"
            required
            value={fecha}
            disabled={ocupado || incierto}
            onChange={(event) => {
              setFecha(event.target.value);
              setDatos(null);
              setSeleccionada(null);
              setError('');
            }}
          />
        </div>

        <button type="submit" disabled={ocupado || incierto}>
          {ocupado ? 'Procesando…' : 'Consultar horarios'}
        </button>
      </form>

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      {datos && (
        <>
          <p>
            Cita actual:{' '}
            {formatearFechaHora(datos.inicioActual, datos.zonaHoraria)}
          </p>

          <p className="nota-resumen">
            Duración acordada: {datos.duracionMinutos} minutos.
            Horas de la barbería: {datos.zonaHoraria}.
          </p>

          {datos.opciones.length === 0 ? (
            <p role="status">
              No hay otros horarios disponibles. Prueba otra fecha.
            </p>
          ) : (
            <ul className="lista-horarios">
              {datos.opciones.map((opcion) => (
                <li key={opcion.inicio}>
                  <button
                    type="button"
                    className="boton-horario"
                    disabled={ocupado}
                    aria-pressed={seleccionada?.inicio === opcion.inicio}
                    onClick={() => {
                      setSeleccionada(opcion);
                      setError('');
                    }}
                  >
                    {opcion.horaLocal}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {seleccionada && (
            <form className="formulario" onSubmit={confirmar}>
              <p>
                Nuevo horario:{' '}
                <strong>
                  {formatearFechaHora(
                    seleccionada.inicio,
                    datos.zonaHoraria,
                  )}
                </strong>
              </p>

              <p>
                Se conservarán el profesional, servicio, precio y duración
                acordados.
              </p>

              <div className="campo">
                <label htmlFor="motivo-reagendar-equipo">
                  Motivo del cambio
                </label>
                <input
                  id="motivo-reagendar-equipo"
                  required
                  minLength={5}
                  maxLength={300}
                  value={motivo}
                  disabled={ocupado}
                  onChange={(event) => setMotivo(event.target.value)}
                />
              </div>

              <button type="submit" disabled={ocupado}>
                {ocupado ? 'Guardando…' : 'Confirmar reagendamiento'}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}