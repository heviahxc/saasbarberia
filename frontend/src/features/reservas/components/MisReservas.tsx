import { useAuth } from "../../auth/auth-context.js";
import { useEffect, useState } from "react";
import ReagendarReserva from "./ReagendarReserva.js";
import { api, ApiError } from "../../../shared/lib/api.js";
import {
  formatearFechaHora,
  formatearPrecio,
} from "../../../shared/lib/formatos.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import type { Reserva } from '../types.js';
import ListadoReservas from './ListadoReservas.js';

type FiltroReservas = 'proximas' | 'pasadas' | 'canceladas';

const filtrosReservas: {
  valor: FiltroReservas;
  etiqueta: string;
}[] = [
  { valor: 'proximas', etiqueta: 'Próximas' },
  { valor: 'pasadas', etiqueta: 'Pasadas' },
  { valor: 'canceladas', etiqueta: 'Canceladas' },
];

const mensajesVacios: Record<FiltroReservas, string> = {
  proximas: 'No tienes reservas próximas ni en curso.',
  pasadas: 'No tienes reservas pasadas.',
  canceladas: 'No tienes reservas canceladas.',
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
  const [reservaDetalleId, setReservaDetalleId] =
  useState<number | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelacion, setErrorCancelacion] = useState("");
  const [aviso, setAviso] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [reservaPorReagendar, setReservaPorReagendar] =
    useState<Reserva | null>(null);
const [ordenFecha, setOrdenFecha] =
  useState<'asc' | 'desc'>('asc');
    const [filtro, setFiltro] = useState<FiltroReservas>('proximas');

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
const gruposReservas: Record<FiltroReservas, Reserva[]> = {
  proximas: [],
  pasadas: [],
  canceladas: [],
};

for (const reserva of reservas) {
  if (reserva.estado === 'CANCELADA') {
    gruposReservas.canceladas.push(reserva);
  } else if (new Date(reserva.fin).getTime() <= ahora) {
    gruposReservas.pasadas.push(reserva);
  } else {
    gruposReservas.proximas.push(reserva);
  }
}

const reservasFiltradas = [...gruposReservas[filtro]].sort(
  (primera, segunda) => {
    const diferencia =
      new Date(primera.inicio).getTime() -
      new Date(segunda.inicio).getTime();

    const comparacion = diferencia || primera.id - segunda.id;

    return ordenFecha === 'asc' ? comparacion : -comparacion;
  },
);
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
      <div className="reservas-cabecera">
        <h2 id="titulo-mis-reservas">Mis reservas</h2>
        <button
          type="button"
          className="boton-secundario reservas-actualizar"
          onClick={() => {
            setReservaPorCancelar(null);
            setErrorCancelacion('');
            setAviso('');
            setIntento((actual) => actual + 1);
          }}
          disabled={cargando || cancelando}
        >
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {aviso && <p className="mensaje-exito" role="status">{aviso}</p>}
      {errorCancelacion && (
        <p className="mensaje-error" role="alert">{errorCancelacion}</p>
      )}

      {reservaDetalleId !== null && (
        <button
          type="button"
          className="boton-secundario volver"
          disabled={cancelando}
          onClick={() => {
            setReservaDetalleId(null);
            setReservaPorCancelar(null);
            setErrorCancelacion('');
          }}
        >
          Volver a la lista
        </button>
      )}

      {reservaDetalleId === null && (
        <>
          <div className="reservas-herramientas">
            <div className="filtros-reservas" role="group" aria-label="Filtrar reservas">
              {filtrosReservas.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  aria-pressed={filtro === opcion.valor}
                  disabled={cargando || cancelando}
                  onClick={() => setFiltro(opcion.valor)}
                >
                  {opcion.etiqueta}
                  {!cargando && !error && (
                    <span className="reservas-contador">
                      <span className="solo-lectores">: </span>
                      {gruposReservas[opcion.valor].length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="orden-reservas">
              <label htmlFor="orden-fecha">Fecha de la cita</label>
              <select
                id="orden-fecha"
                value={ordenFecha}
                disabled={cargando || cancelando}
                onChange={(evento) =>
                  setOrdenFecha(evento.target.value === 'desc' ? 'desc' : 'asc')
                }
              >
                <option value="asc">Más antiguas primero</option>
                <option value="desc">Más recientes primero</option>
              </select>
            </div>
          </div>
          {filtro === 'proximas' && (
            <p className="nota-resumen">
              Incluye las citas en curso hasta su hora de término.
            </p>
          )}
        </>
      )}
      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando tus reservas…" />
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
 ) : reservaDetalleId === null ? (
  reservasFiltradas.length === 0 ? (
    <EstadoContenido
      tipo="vacio"
      mensaje={mensajesVacios[filtro]}
    />
  ) : (
    <ListadoReservas
      reservas={reservasFiltradas}
      onVerDetalle={(id) => {
        setReservaDetalleId(id);
        setReservaPorCancelar(null);
        setErrorCancelacion('');
        setAviso('');
      }}
    />
  )
) : !reservas.some((reserva) => reserva.id === reservaDetalleId) ? (
  <EstadoContenido
    tipo="vacio"
    mensaje="Esta reserva ya no aparece en tu lista."
  />
) : (
  <ul className="lista-barberias">
          {reservas
  .filter((reserva) => reserva.id === reservaDetalleId)
  .map((reserva) => {
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

                  <dt>Dirección actual</dt>
                  <dd>
                    {reserva.barberia.direccion?.trim() ||
                      "Dirección pendiente de informar"}
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
