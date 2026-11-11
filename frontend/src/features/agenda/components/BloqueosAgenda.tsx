import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../auth/auth-context.js";
import { api } from "../../../shared/lib/api.js";
import { formatearFechaHora } from "../../../shared/lib/formatos.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";

type Profesional = { id: number; nombre: string };
type CitaAfectada = {
  id: number;
  inicio: string;
  fin: string;
  nombreServicio: string;
  cliente: { id: number; nombre: string };
};
type Impacto = { reservas: CitaAfectada[]; cantidadReservasAfectadas: number };
function CitasPendientes({
  citas,
  zona,
}: {
  citas: CitaAfectada[];
  zona: string;
}) {
  return (
    <ul className="bloqueo-pendientes">
      {citas.map((cita) => (
        <li key={cita.id}>
          <strong>{cita.cliente.nombre}</strong> · {cita.nombreServicio}
          <br />
          {formatearFechaHora(cita.inicio, zona)} —{" "}
          {formatearFechaHora(cita.fin, zona)}
          <small>Reserva #{cita.id} · Pendiente de coordinar</small>
        </li>
      ))}
    </ul>
  );
}
type Bloqueo = {
  id: number;
  inicio: string;
  fin: string;
  motivo: string | null;
  estado: "PENDIENTE_RESOLUCION" | "SIN_PENDIENTES";
  reservasPendientes: CitaAfectada[];
};
type Props = {
  barberiaId: number;
  profesionalId: number | null;
  administrador: boolean;
  zona: string;
  fecha: string;
};
export default function BloqueosAgenda({
  barberiaId,
  profesionalId,
  administrador,
  zona,
  fecha,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [seleccionado, setSeleccionado] = useState(
    profesionalId?.toString() ?? "",
  );
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [inicio, setInicio] = useState(`${fecha}T09:00`);
  const [fin, setFin] = useState(`${fecha}T10:00`);
  const [motivo, setMotivo] = useState("");
  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);
  const enCurso = useRef(false);
  const ruta = `/barberias/${barberiaId}/profesionales/${seleccionado}/bloqueos`;
  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      if (!token) return;
      setCargando(true);
      setError("");
      setBloqueos([]);
      try {
        if (administrador) {
          const lista = await api<Profesional[]>(
            `/barberias/${barberiaId}/profesionales`,
            { token, signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          setProfesionales(lista);
        }
        if (seleccionado) {
          const datos = await api<Bloqueo[]>(ruta, {
            token,
            signal: controller.signal,
          });
          if (!controller.signal.aborted) setBloqueos(datos);
        }
      } catch (fallo) {
        if (!controller.signal.aborted)
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudieron consultar los bloqueos.",
          );
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [token, barberiaId, administrador, seleccionado, ruta, intento]);
  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!token || !seleccionado || enCurso.current) return;
    setError("");
    setAviso("");
    if (!inicio || !fin || fin <= inicio) {
      setError("El fin debe ser posterior al inicio.");
      return;
    }
    enCurso.current = true;
    setGuardando(true);
    try {
      const datos = await api<Impacto>(ruta + "/local/impacto", {
        method: "POST",
        token,
        body: { inicioLocal: inicio, finLocal: fin, motivo: motivo.trim() },
      });
      setImpacto(datos);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo confirmar el resultado. Actualiza la lista antes de volver a intentarlo.",
      );
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }
  async function confirmarCreacion() {
    if (!token || !impacto || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      await api(ruta + "/local/pendiente", {
        method: "POST",
        token,
        body: { inicioLocal: inicio, finLocal: fin, motivo: motivo.trim() },
      });
      setImpacto(null);
      setAviso(
        "Intervalo bloqueado para nuevas reservas. Las citas existentes se conservan; revisa las pendientes en el listado.",
      );
      setMotivo("");
      setIntento((i) => i + 1);
    } catch (fallo) {
      setImpacto(null);
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No pudimos confirmar el resultado. Actualiza el listado antes de volver a intentarlo.",
      );
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }
  async function eliminar(id: number) {
    if (!token || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      await api(`${ruta}/${id}`, { method: "DELETE", token });
      setConfirmar(null);
      setAviso(
        "Bloqueo eliminado. Se vuelve a calcular la disponibilidad con tus horarios y reservas.",
      );
      setIntento((i) => i + 1);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo eliminar el bloqueo. Actualiza la lista para comprobarlo.",
      );
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }
  return (
    <section className="bloqueos-agenda" aria-labelledby="titulo-bloqueos">
      <h3 id="titulo-bloqueos">
        {administrador ? "Bloqueos del equipo" : "Mis bloqueos"}
      </h3>
      <p>
        Revisa las citas afectadas antes de bloquear. El bloqueo impide nuevas
        reservas y conserva las citas existentes hasta que coordines su
        cancelación o reagendamiento.
      </p>
      <p className="nota-resumen">
        Introduce las fechas y horas de la barbería ({zona}). Puedes bloquear
        varios días.
      </p>
      {administrador && (
        <label>
          Profesional
          <select
            disabled={guardando}
            value={seleccionado}
            onChange={(e) => {
              setSeleccionado(e.target.value);
              setImpacto(null);
              setBloqueos([]);
              setConfirmar(null);
              setAviso("");
            }}
          >
            <option value="">Selecciona un profesional</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {seleccionado && (
        <form onSubmit={(e) => void guardar(e)}>
          <fieldset
            disabled={guardando || cargando}
            className="bloqueos-campos"
          >
            <legend>Nuevo bloqueo</legend>
            <label>
              Desde
              <input
                required
                type="datetime-local"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  setImpacto(null);
                }}
              />
            </label>
            <label>
              Hasta
              <input
                required
                type="datetime-local"
                value={fin}
                onChange={(e) => {
                  setFin(e.target.value);
                  setImpacto(null);
                }}
              />
            </label>
            <label>
              Motivo (opcional)
              <input
                maxLength={300}
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setImpacto(null);
                }}
                placeholder="Por ejemplo: trámite personal"
              />
            </label>
            <button type="submit">
              {guardando ? "Consultando…" : "Revisar citas afectadas"}
            </button>
          </fieldset>
        </form>
      )}
      {impacto && (
        <div className="bloqueo-impacto" aria-live="polite">
          <h4>
            {impacto.reservas.length
              ? `${impacto.reservas.length} citas por resolver`
              : "No hay citas afectadas"}
          </h4>
          <CitasPendientes citas={impacto.reservas} zona={zona} />
          <p>
            Al confirmar, nadie podrá reservar ni reagendar hacia este
            intervalo. Las citas existentes no se cancelarán ni se moverán. Si
            entran más citas antes de confirmar, también aparecerán como
            pendientes.
          </p>
          <div className="grupo-acciones">
            <button
              disabled={guardando || cargando}
              onClick={() => void confirmarCreacion()}
            >
              {guardando
                ? "Guardando…"
                : impacto.reservas.length
                  ? "Bloquear y conservar las citas"
                  : "Confirmar bloqueo"}
            </button>
            <button
              className="boton-secundario"
              disabled={guardando}
              onClick={() => setImpacto(null)}
            >
              Volver a editar
            </button>
          </div>
        </div>
      )}
      {aviso && (
        <p role="status" className="mensaje-exito">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="mensaje-error">
          {error}
        </p>
      )}
      <button
        type="button"
        className="boton-secundario"
        disabled={cargando || guardando}
        onClick={() => setIntento((i) => i + 1)}
      >
        Actualizar bloqueos
      </button>
      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando bloqueos…" />
      ) : seleccionado && !error && bloqueos.length === 0 ? (
        <EstadoContenido
          tipo="vacio"
          mensaje="Este profesional no tiene bloqueos."
        />
      ) : null}
      {bloqueos.length > 0 && (
        <div className="agenda-tabla">
          <table className="tabla-reservas">
            <caption>Bloqueos registrados (todas las fechas)</caption>
            <thead>
              <tr>
                <th scope="col">Desde</th>
                <th scope="col">Hasta</th>
                <th scope="col">Motivo</th>
                <th scope="col">Resolución</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bloqueos.map((b) => (
                <tr key={b.id}>
                  <td>{formatearFechaHora(b.inicio, zona)}</td>
                  <td>{formatearFechaHora(b.fin, zona)}</td>
                  <td>{b.motivo || "Sin motivo"}</td>
                  <td>
                    <strong>
                      {b.estado === "PENDIENTE_RESOLUCION"
                        ? `Pendiente · ${b.reservasPendientes.length} citas`
                        : "Sin citas pendientes"}
                    </strong>
                    {b.reservasPendientes.length > 0 && (
                      <details>
                        <summary>Ver citas por resolver</summary>
                        <CitasPendientes
                          citas={b.reservasPendientes}
                          zona={zona}
                        />
                        <p>
                          Coordina el cambio con cada cliente. Después actualiza
                          los bloqueos para revisar qué citas siguen pendientes.
                        </p>
                      </details>
                    )}
                  </td>
                  <td>
                    {confirmar === b.id ? (
                      <>
                        <p>
                          ¿Eliminar este bloqueo? Se podrán ofrecer nuevas horas
                          en el intervalo. Las reservas existentes se
                          conservarán.
                        </p>
                        <div className="grupo-acciones">
                          <button
                            disabled={guardando}
                            onClick={() => void eliminar(b.id)}
                          >
                            Sí, eliminar
                          </button>
                          <button
                            className="boton-secundario"
                            disabled={guardando}
                            onClick={() => setConfirmar(null)}
                          >
                            Conservar
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="boton-secundario"
                        disabled={guardando}
                        onClick={() => setConfirmar(b.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
