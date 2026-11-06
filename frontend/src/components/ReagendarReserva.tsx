import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from '../lib/api.js';
import {
  formatearFechaHora,
  formatearPrecio,
} from '../lib/formatos.js';
type Opcion = {
  horaLocal: string;
  inicio: string;
  fin: string;
};

type Disponibilidad = {
  reservaId: number;
  inicioActual: string;
  fecha: string;
  zonaHoraria: string;
  duracionMinutos: number;
  opciones: Opcion[];
};

type ReservaActualizada = {
  id: number;
  inicio: string;
  fin: string;
  zonaHoraria: string;
  duracionMinutos: number;
  precioAcordado: string;
};

type Props = {
  accessToken: string;
  reservaId: number;
  nombreServicio: string;
  onVolver: () => void;
};

export default function ReagendarReserva({
  accessToken,
  reservaId,
  nombreServicio,
  onVolver,
}: Props) {
  const [fecha, setFecha] = useState("");
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(
    null,
  );
  const [seleccionada, setSeleccionada] = useState<Opcion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [reservaActualizada, setReservaActualizada] =
    useState<ReservaActualizada | null>(null);
 async function consultarHorarios(
  evento: FormEvent<HTMLFormElement>,
) {
  evento.preventDefault();

  if (cargando || confirmando) return;

  setCargando(true);
  setError('');
  setDisponibilidad(null);
  setSeleccionada(null);

  try {
    const parametros = new URLSearchParams({ fecha });

    const datos = await api<Disponibilidad>(
      `/reservas/${reservaId}/disponibilidad?${parametros}`,
      {
        token: accessToken,
      },
    );

    setDisponibilidad(datos);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setError(
        'Tu sesión no es válida o ha vencido. Cierra sesión e ingresa nuevamente.',
      );
    } else {
      setError(
        error instanceof TypeError
          ? 'No se pudo conectar con el servidor.'
          : error instanceof Error
            ? error.message
            : 'No se pudieron consultar los horarios.',
      );
    }
  } finally {
    setCargando(false);
  }
}
 async function confirmarCambio() {
  if (
    !seleccionada ||
    !disponibilidad ||
    confirmando ||
    cargando
  ) {
    return;
  }

  setConfirmando(true);
  setError('');

  try {
    const datos = await api<ReservaActualizada>(
      `/reservas/${reservaId}/reagendar`,
      {
        method: 'PATCH',
        token: accessToken,
        body: {
          inicio: seleccionada.inicio,
        },
      },
    );

    setReservaActualizada(datos);
    setSeleccionada(null);
    setDisponibilidad(null);
  } catch (error) {
    setSeleccionada(null);
    setDisponibilidad(null);

    if (error instanceof ApiError) {
      if (error.status === 401) {
        setError(
          'Tu sesión no es válida o ha vencido. Cierra sesión e ingresa nuevamente.',
        );
      } else if (
        error.status === 400 ||
        error.status === 404 ||
        error.status === 409
      ) {
        setError(error.message);
      } else {
        setError(
          'No pudimos confirmar el resultado. Vuelve a Mis reservas para comprobar el horario antes de intentar otro cambio.',
        );
      }
    } else {
      setError(
        'No pudimos confirmar el resultado. Vuelve a Mis reservas para comprobar el horario antes de intentar otro cambio.',
      );
    }
  } finally {
    setConfirmando(false);
  }
}
  if (reservaActualizada) {
   const fechaNueva = formatearFechaHora(
  reservaActualizada.inicio,
  reservaActualizada.zonaHoraria,
);

    return (
      <section aria-labelledby="titulo-cambio-confirmado">
        <h2 id="titulo-cambio-confirmado">¡Horario actualizado!</h2>

        <p className="mensaje-exito" role="status">
          Tu reserva fue reagendada correctamente.
        </p>

        <dl className="resumen-reserva">
          <dt>Número de reserva</dt>
          <dd>{reservaActualizada.id}</dd>

          <dt>Servicio</dt>
          <dd>{nombreServicio}</dd>

          <dt>Nueva fecha y hora</dt>
          <dd>{fechaNueva}</dd>

          <dt>Zona horaria</dt>
          <dd>{reservaActualizada.zonaHoraria}</dd>

          <dt>Duración acordada</dt>
          <dd>{reservaActualizada.duracionMinutos} minutos</dd>

         <dt>Precio acordado</dt>
<dd>{formatearPrecio(reservaActualizada.precioAcordado)}</dd>
        </dl>

        <button type="button" onClick={onVolver}>
          Volver a mis reservas
        </button>
      </section>
    );
  }
  return (
    <section aria-labelledby="titulo-reagendar">
      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
        disabled={cargando || confirmando}
      >
        Volver a mis reservas
      </button>

      <h2 id="titulo-reagendar">Reagendar reserva</h2>

      <p>
        Reserva #{reservaId} · {nombreServicio}
      </p>

      <p>
        Elige una nueva fecha. Tu reserva actual se mantiene hasta que confirmes
        el cambio.
      </p>

      <form
        className="formulario"
        onSubmit={consultarHorarios}
        aria-busy={cargando}
      >
        <div className="campo">
          <label htmlFor="fecha-reagendar">Nueva fecha</label>
          <input
            id="fecha-reagendar"
            type="date"
            required
            value={fecha}
            disabled={cargando || confirmando}
            onChange={(evento) => {
              setFecha(evento.target.value);
              setDisponibilidad(null);
              setSeleccionada(null);
              setError("");
            }}
          />
        </div>

        <button type="submit" disabled={cargando || confirmando}>
          {cargando ? "Consultando…" : "Consultar horarios"}
        </button>
      </form>

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      {disponibilidad && (
        <div>
         <p>
  Cita actual:{' '}
  {formatearFechaHora(
    disponibilidad.inicioActual,
    disponibilidad.zonaHoraria,
  )}
</p>

          <p>
            Duración acordada: {disponibilidad.duracionMinutos} minutos
            <br />
            Horas de la barbería: {disponibilidad.zonaHoraria}
          </p>

          {disponibilidad.opciones.length === 0 ? (
            <p role="status">
              No hay otros horarios disponibles para esa fecha. Prueba otro día.
            </p>
          ) : (
            <>
              <ul className="lista-horarios">
                {disponibilidad.opciones.map((opcion) => (
                  <li key={opcion.inicio}>
                    <button
                      type="button"
                      className="boton-horario"
                      aria-pressed={seleccionada?.inicio === opcion.inicio}
                      onClick={() => setSeleccionada(opcion)}
                    >
                      {opcion.horaLocal}
                    </button>
                  </li>
                ))}
              </ul>

              {seleccionada && (
                <div>
                  <p>
                    Nueva fecha: <strong>{disponibilidad.fecha}</strong>
                    <br />
                    Nueva hora: <strong>{seleccionada.horaLocal}</strong>
                    <br />
                    Zona horaria: {disponibilidad.zonaHoraria}
                  </p>

                  <p>
                    Al confirmar, tu cita cambiará a este horario. Se
                    conservarán el precio y la duración acordados.
                  </p>

                  <button
                    type="button"
                    onClick={confirmarCambio}
                    disabled={confirmando}
                  >
                    {confirmando ? "Guardando cambio…" : "Confirmar cambio"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
