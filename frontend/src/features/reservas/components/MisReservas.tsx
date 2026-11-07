import { useAuth } from '../../auth/auth-context.js';
import { useEffect, useState } from "react";
import ReagendarReserva from "./ReagendarReserva.js";
import { api, ApiError } from "../../../shared/lib/api.js";
import { formatearFechaHora, formatearPrecio } from "../../../shared/lib/formatos.js";
import EstadoContenido from '../../../shared/components/EstadoContenido.js';
type Reserva = {
  id: number;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  precioAcordado: string;
  nombreServicio: string;
  zonaHoraria: string;
  estado: "CONFIRMADA" | "CANCELADA";
  creadoEn: string;
  canceladoEn: string | null;
  barberia: {
    id: number;
    nombre: string;
    ciudad: string;
  };
  profesional: {
    id: number;
    nombre: string;
  };
};

export default function MisReservas() {
  const { sesion } = useAuth();
  const accessToken = sesion?.accessToken;
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [reservaPorCancelar, setReservaPorCancelar] = useState<number | null>(
    null,
  );
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState("");
  const [aviso, setAviso] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [reservaPorReagendar, setReservaPorReagendar] =
    useState<Reserva | null>(null);
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);
  useEffect(() => {
    const controlador = new AbortController();

    async function cargarReservas() {
      if (!accessToken) return;

      setCargando(true);
      setError("");

      try {
        const datos = await api<Reserva[]>("/reservas/mias", {
          token: accessToken,
          signal: controlador.signal,
        });

        if (!controlador.signal.aborted) {
          setReservas(datos);
        }
      } catch (error) {
        if (controlador.signal.aborted) return;

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
                : "No se pudieron cargar tus reservas.",
          );
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargarReservas();

    return () => controlador.abort();
  }, [accessToken, intento]);
  async function cancelarReserva(reservaId: number) {
    if (cancelando || cargando || !accessToken) return;

    setCancelando(true);
    setErrorCancelacion("");
    setAviso("");

    try {
      await api<{
        id: number;
        estado: "CANCELADA";
        canceladoEn: string;
      }>(`/reservas/${reservaId}/cancelar`, {
        method: "PATCH",
        token: accessToken,
      });

      setReservaPorCancelar(null);
      setAviso(`La reserva ${reservaId} fue cancelada.`);
      setIntento((actual) => actual + 1);
    } catch (error) {
      setReservaPorCancelar(null);

      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrorCancelacion(
            "Tu sesión no es válida o ha vencido. Cierra sesión e ingresa nuevamente.",
          );
        } else if (
          error.status === 400 ||
          error.status === 404 ||
          error.status === 409
        ) {
          setErrorCancelacion(error.message);
          setIntento((actual) => actual + 1);
        } else {
          setErrorCancelacion(
            "No pudimos confirmar el resultado. Pulsa Actualizar para comprobar si la reserva quedó cancelada.",
          );
        }
      } else {
        setErrorCancelacion(
          "No pudimos confirmar el resultado. Pulsa Actualizar para comprobar si la reserva quedó cancelada.",
        );
      }
    } finally {
      setCancelando(false);
    }
  }

  if (reservaPorReagendar) {
    return (
      <ReagendarReserva
        key={reservaPorReagendar.id}
        reservaId={reservaPorReagendar.id}
        nombreServicio={reservaPorReagendar.nombreServicio}
        onVolver={() => {
          setReservaPorReagendar(null);
          setIntento((actual) => actual + 1);
        }}
      />
    );
  }
  return (
    <section aria-labelledby="titulo-mis-reservas">
      <h2 id="titulo-mis-reservas">Mis reservas</h2>

      <button
        type="button"
        className="boton-secundario"
        onClick={() => {
          setReservaPorCancelar(null);
          setErrorCancelacion("");
          setAviso("");
          setIntento((actual) => actual + 1);
        }}
        disabled={cargando || cancelando}
      >
        {aviso && (
          <p className="mensaje-exito" role="status">
            {aviso}
          </p>
        )}

        {errorCancelacion && (
          <p className="mensaje-error" role="alert">
            {errorCancelacion}
          </p>
        )}
        {cargando ? "Cargando…" : "Actualizar"}
      </button>

      {cargando ? (
  <EstadoContenido
    tipo="cargando"
    mensaje="Consultando tus reservas…"
  />
) : error ? (
  <EstadoContenido
    tipo="error"
    mensaje={error}
    onReintentar={() => setIntento((actual) => actual + 1)}
  />
) : reservas.length === 0 ? (
  <EstadoContenido
    tipo="vacio"
    mensaje="Todavía no tienes reservas. Puedes crear una en «Reservar»."
  />
) :  (
        <ul className="lista-barberias">
          {reservas.map((reserva) => {
            const fecha = formatearFechaHora(
              reserva.inicio,
              reserva.zonaHoraria,
            );
            const puedeCancelar =
              reserva.estado === "CONFIRMADA" &&
              new Date(reserva.inicio).getTime() > ahora;
            return (
              <li key={reserva.id} className="barberia">
                <span
                  className={`estado-reserva ${
                    reserva.estado === "CONFIRMADA"
                      ? "estado-confirmada"
                      : "estado-cancelada"
                  }`}
                >
                  {reserva.estado === "CONFIRMADA" ? "Confirmada" : "Cancelada"}
                </span>

                <h3>{reserva.nombreServicio}</h3>

                <dl className="resumen-reserva">
                  <dt>Número de reserva</dt>
                  <dd>{reserva.id}</dd>

                  <dt>Barbería</dt>
                  <dd>
                    {reserva.barberia.nombre} · {reserva.barberia.ciudad}
                  </dd>

                  <dt>Profesional</dt>
                  <dd>{reserva.profesional.nombre}</dd>

                  <dt>Fecha y hora</dt>
                  <dd>{fecha}</dd>

                  <dt>Zona horaria</dt>
                  <dd>{reserva.zonaHoraria}</dd>

                  <dt>Duración</dt>
                  <dd>{reserva.duracionMinutos} minutos</dd>

                  <dt>Precio acordado</dt>
                  <dd>{formatearPrecio(reserva.precioAcordado)}</dd>
                </dl>

                {puedeCancelar && (
                  <button
                    type="button"
                    className="boton-secundario boton-reagendar"
                    disabled={cancelando}
                    onClick={() => {
                      setReservaPorCancelar(null);
                      setErrorCancelacion("");
                      setAviso("");
                      setReservaPorReagendar(reserva);
                    }}
                  >
                    Reagendar
                  </button>
                )}

                {puedeCancelar &&
                  (reservaPorCancelar === reserva.id ? (
                    <div className="confirmacion-cancelacion">
                      <p>
                        ¿Quieres cancelar esta reserva? La hora quedará
                        disponible para otros clientes.
                      </p>

                      <div className="acciones-reserva">
                        <button
                          type="button"
                          className="boton-peligro"
                          onClick={() => cancelarReserva(reserva.id)}
                          disabled={cancelando}
                        >
                          {cancelando ? "Cancelando…" : "Sí, cancelar reserva"}
                        </button>

                        <button
                          type="button"
                          className="boton-secundario"
                          onClick={() => {
                            setReservaPorCancelar(null);
                            setErrorCancelacion("");
                          }}
                          disabled={cancelando}
                        >
                          Conservar reserva
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() => {
                        setReservaPorCancelar(reserva.id);
                        setErrorCancelacion("");
                        setAviso("");
                      }}
                      disabled={cancelando}
                    >
                      Cancelar reserva
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
