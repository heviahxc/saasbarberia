import EstadoCita from "../../../shared/components/EstadoCita.js";
import type { EstadoReserva } from "../../../shared/lib/estados-reserva.js";
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/auth-context.js";
import { api } from "../../../shared/lib/api.js";
import { formatearFechaHora } from "../../../shared/lib/formatos.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";

type Actor = {
  id: number;
  nombre: string;
};

type Historial = {
  id: number;
  nombreServicio: string;
  estado: EstadoReserva;
  cierre: { estado: EstadoReserva; creadoEn: string; actor: Actor } | null;
  inicio: string;
  fin: string;
  zonaHoraria: string;
  canceladoEn: string | null;
  cliente: Actor;
  profesional: Actor;
  cancelacion: {
    motivo: string | null;
    creadoEn: string;
    actor: Actor;
  } | null;
  reagendamientos: {
    id: number;
    inicioAnterior: string;
    finAnterior: string;
    inicioNuevo: string;
    finNuevo: string;
    motivo: string | null;
    creadoEn: string;
    actor: Actor;
  }[];
};

type Props = {
  barberiaId: number;
  reservaId: number;
  onVolver: () => void;
};

export default function HistorialCitaEquipo({
  barberiaId,
  reservaId,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;

  const [datos, setDatos] = useState<Historial | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function cargar() {
      if (!token) return;

      setCargando(true);
      setError("");
      setDatos(null);

      try {
        const respuesta = await api<Historial>(
          `/barberias/${barberiaId}/reservas/${reservaId}/historial`,
          {
            token,
            signal: controller.signal,
          },
        );

        if (!controller.signal.aborted) {
          setDatos(respuesta);
        }
      } catch (fallo) {
        if (!controller.signal.aborted) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar el historial.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargar();

    return () => controller.abort();
  }, [barberiaId, reservaId, token, intento]);

  return (
    <section aria-labelledby="titulo-historial-equipo">
      <button type="button" className="boton-secundario" onClick={onVolver}>
        Volver a la agenda
      </button>

      <h2 id="titulo-historial-equipo">Historial de la cita #{reservaId}</h2>

      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando el historial…" />
      ) : error ? (
        <EstadoContenido
          tipo="error"
          mensaje={error}
          onReintentar={() => setIntento((actual) => actual + 1)}
        />
      ) : datos ? (
        <>
          <p>
            <strong>{datos.cliente.nombre}</strong> · {datos.nombreServicio}
          </p>

          <p>Profesional: {datos.profesional.nombre}</p>

          <p>
            Estado: <EstadoCita estado={datos.estado} />
          </p>

          <p>
            Último horario registrado:{" "}
            {formatearFechaHora(datos.inicio, datos.zonaHoraria)}
          </p>

          <p className="nota-resumen">
            Todas las fechas se muestran en {datos.zonaHoraria}.
          </p>

          {datos.cierre && (
            <article className="historial-evento">
              <h3>Cierre de la cita</h3>
              <EstadoCita estado={datos.cierre.estado} />
              <p>
                Registrado por <strong>{datos.cierre.actor.nombre}</strong>
              </p>
              <p>
                {formatearFechaHora(datos.cierre.creadoEn, datos.zonaHoraria)}
              </p>
            </article>
          )}
          {datos.estado === "CANCELADA" && (
            <article className="historial-evento">
              <h3>Cancelación</h3>

              {datos.canceladoEn && (
                <p>
                  Fecha:{" "}
                  {formatearFechaHora(datos.canceladoEn, datos.zonaHoraria)}
                </p>
              )}

              {datos.cancelacion ? (
                <>
                  <p>
                    Realizada por:{" "}
                    <strong>{datos.cancelacion.actor.nombre}</strong>
                  </p>
                  <p>
                    Motivo:{" "}
                    {datos.cancelacion.motivo || "Sin motivo registrado"}
                  </p>
                </>
              ) : (
                <p>
                  No hay un registro de autor y motivo para esta cancelación.
                </p>
              )}
            </article>
          )}

          <h3>Reagendamientos</h3>

          {datos.reagendamientos.length === 0 ? (
            <p>Esta cita no tiene reagendamientos registrados.</p>
          ) : (
            <ol className="historial-eventos">
              {datos.reagendamientos.map((cambio) => (
                <li key={cambio.id} className="historial-evento">
                  <p>
                    <strong>{cambio.actor.nombre}</strong> realizó el cambio el{" "}
                    {formatearFechaHora(cambio.creadoEn, datos.zonaHoraria)}.
                  </p>

                  <p>
                    Horario anterior:{" "}
                    {formatearFechaHora(
                      cambio.inicioAnterior,
                      datos.zonaHoraria,
                    )}
                  </p>

                  <p>
                    Nuevo horario:{" "}
                    {formatearFechaHora(cambio.inicioNuevo, datos.zonaHoraria)}
                  </p>

                  <p>Motivo: {cambio.motivo || "Sin motivo registrado"}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </section>
  );
}
