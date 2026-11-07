import { useAuth } from '../../auth/auth-context.js';
import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../../../shared/lib/api.js";
import { formatearFechaHora, formatearPrecio } from "../../../shared/lib/formatos.js";
import PasosReserva from "./PasosReserva.js";
import ResumenReserva from "./ResumenReserva.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
type Opcion = {
  horaLocal: string;
  inicio: string;
  fin: string;
};

type Disponibilidad = {
  fecha: string;
  zonaHoraria: string;
  profesionalId: number;
  servicioId: number;
  duracionMinutos: number;
  opciones: Opcion[];
};

type ReservaCreada = {
  id: number;
  estado: "CONFIRMADA" | "CANCELADA";
  inicio: string;
  fin: string;
  nombreServicio: string;
  duracionMinutos: number;
  precioAcordado: string;
  zonaHoraria: string;
};

type Props = {
  barberiaId: number;
  servicioId: number;
  profesionalId: number;
  nombreBarberia: string;
  nombreServicio: string;
  nombreProfesional: string;
  duracionMinutos: number;
  precio: string;
  onVolver: () => void;
};

export default function DisponibilidadServicio({
  barberiaId,
  servicioId,
  profesionalId,
  nombreBarberia,
  nombreServicio,
  nombreProfesional,
  duracionMinutos,
  precio,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const accessToken = sesion?.accessToken;
  const [fecha, setFecha] = useState("");
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(
    null,
  );
  const [seleccionada, setSeleccionada] = useState<Opcion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [reservaCreada, setReservaCreada] = useState<ReservaCreada | null>(
    null,
  );
  async function consultarHorarios(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (cargando || confirmando || !accessToken) return;

    setCargando(true);
    setError("");
    setDisponibilidad(null);
    setSeleccionada(null);

    try {
      const parametros = new URLSearchParams({
        fecha,
        profesionalId: String(profesionalId),
        servicioId: String(servicioId),
      });

      const datos = await api<Disponibilidad>(
        `/barberias/${barberiaId}/reservas/disponibilidad?${parametros}`,
        {
          token: accessToken,
        },
      );

      setDisponibilidad(datos);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError(
          "Tu sesión no es válida o ha vencido. Cierra sesión e ingresa nuevamente.",
        );
      } else {
        setError(
          error instanceof TypeError
            ? "No se pudo conectar con el servidor."
            : error instanceof Error
              ? error.message
              : "No se pudieron consultar los horarios.",
        );
      }
    } finally {
      setCargando(false);
    }
  }
  async function confirmarReserva() {
    if (!seleccionada || !disponibilidad || confirmando || cargando || !accessToken) {
      return;
    }

    setConfirmando(true);
    setError("");

    try {
      const datos = await api<ReservaCreada>(
        `/barberias/${barberiaId}/reservas`,
        {
          method: "POST",
          token: accessToken,
          body: {
            profesionalId,
            servicioId,
            inicio: seleccionada.inicio,
          },
        },
      );

      setReservaCreada(datos);
      setSeleccionada(null);
      setDisponibilidad(null);
   } catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      setError(
        'Tu sesión no es válida o ha vencido. Cierra sesión e ingresa nuevamente.',
      );
    } else if (error.status === 403) {
      setSeleccionada(null);
      setDisponibilidad(null);
      setError(error.message);
    } else if (
      error.status === 400 ||
      error.status === 404 ||
      error.status === 409
    ) {
      setSeleccionada(null);
      setDisponibilidad(null);

      setError(
        `${error.message} Consulta nuevamente los horarios.`,
      );
    } else {
      setSeleccionada(null);
      setDisponibilidad(null);

      setError(
        'No pudimos confirmar el resultado de la operación. Revisa Mis reservas antes de intentar reservar nuevamente.',
      );
    }
  } else {
    setSeleccionada(null);
    setDisponibilidad(null);

    setError(
      'No pudimos confirmar el resultado de la operación. Revisa Mis reservas antes de intentar reservar nuevamente.',
    );
  }
} finally {
  setConfirmando(false);
}
  }

  if (reservaCreada) {
    return (
      <section aria-labelledby="titulo-confirmacion">
        <h2 id="titulo-confirmacion">¡Tu reserva está confirmada!</h2>

        <p className="mensaje-exito" role="status">
          Tu hora quedó reservada correctamente.
        </p>

        <dl className="resumen-reserva">
          <dt>Número de reserva</dt>
          <dd>{reservaCreada.id}</dd>

          <dt>Barbería</dt>
          <dd>{nombreBarberia}</dd>

          <dt>Profesional</dt>
          <dd>{nombreProfesional}</dd>

          <dt>Servicio</dt>
          <dd>{reservaCreada.nombreServicio}</dd>

          <dt>Fecha y hora</dt>
          <dd>
            {formatearFechaHora(
              reservaCreada.inicio,
              reservaCreada.zonaHoraria,
            )}
          </dd>

          <dt>Zona horaria</dt>
          <dd>{reservaCreada.zonaHoraria}</dd>

          <dt>Duración</dt>
          <dd>{reservaCreada.duracionMinutos} minutos</dd>

          <dt>Precio acordado</dt>
          <dd>{formatearPrecio(reservaCreada.precioAcordado)}</dd>
        </dl>

        <button type="button" className="boton-secundario" onClick={onVolver}>
          Volver a los profesionales
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-disponibilidad">
      <PasosReserva pasoActual={4} />

      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
        disabled={cargando || confirmando}
      >
        Volver a los profesionales
      </button>

      <h2 id="titulo-disponibilidad">Elige tu horario</h2>

      <div className="distribucion-reserva">
        <div className="selector-horarios">
          <form
            className="formulario"
            onSubmit={consultarHorarios}
            aria-busy={cargando}
          >
            <div className="campo">
              <label htmlFor="fecha-reserva">Fecha de la cita</label>
              <input
                id="fecha-reserva"
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
          {cargando && (
            <EstadoContenido
              tipo="cargando"
              mensaje="Consultando las horas disponibles…"
            />
          )}
          {error && <EstadoContenido tipo="error" mensaje={error} />}
          {disponibilidad && (
            <div>
              <h3>Horarios disponibles</h3>

              <p>
                Fecha: {disponibilidad.fecha}
                <br />
                Horas de la barbería: {disponibilidad.zonaHoraria}
              </p>

              {disponibilidad.opciones.length === 0 ? (
                <EstadoContenido
                  tipo="vacio"
                  mensaje="No hay horas disponibles para esa fecha. Prueba otro día."
                />
              ) : (
                <ul className="lista-horarios">
                  {disponibilidad.opciones.map((opcion) => (
                    <li key={opcion.inicio}>
                      <button
                        type="button"
                        className="boton-horario"
                        aria-pressed={seleccionada?.inicio === opcion.inicio}
                        disabled={confirmando}
                        onClick={() => setSeleccionada(opcion)}
                      >
                        {opcion.horaLocal}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <ResumenReserva
          nombreBarberia={nombreBarberia}
          nombreServicio={nombreServicio}
          nombreProfesional={nombreProfesional}
          duracionMinutos={disponibilidad?.duracionMinutos ?? duracionMinutos}
          precio={precio}
          inicio={seleccionada?.inicio}
          zonaHoraria={disponibilidad?.zonaHoraria}
          confirmando={confirmando}
          puedeConfirmar={
            seleccionada !== null && disponibilidad !== null && !cargando
          }
          onConfirmar={confirmarReserva}
        />
      </div>
    </section>
  );
}
