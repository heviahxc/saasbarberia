import HorariosProfesional from "./HorariosProfesional.js";
import ServiciosProfesional from "./ServiciosProfesional.js";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../auth/auth-context.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { ApiError } from "../../../shared/lib/api.js";
import {
  consultarEquipo,
  crearProfesional,
  invitarProfesional,
  revocarInvitacion,
} from "../api.js";
import type { Equipo, InvitacionGenerada } from "../types.js";
import "../equipo.css";

type Props = {
  barberiaId: number;
  nombreBarberia: string;
  onVolver: () => void;
};
const etiquetas = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  REVOCADA: "Revocada",
  VENCIDA: "Vencida",
};

export default function MiEquipo({
  barberiaId,
  nombreBarberia,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const [profesionalHorarios, setProfesionalHorarios] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [profesionalServicios, setProfesionalServicios] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const token = sesion?.accessToken;
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const enCurso = useRef(false);
  const [nombre, setNombre] = useState("");
  const [profesionalId, setProfesionalId] = useState("");
  const [email, setEmail] = useState("");
  const [generada, setGenerada] = useState<InvitacionGenerada | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [resultadoIncierto, setResultadoIncierto] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      if (!token) return;
      setCargando(true);
      setErrorCarga("");
      try {
        const datos = await consultarEquipo(
          barberiaId,
          token,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setEquipo(datos);
          setResultadoIncierto(false);
        }
      } catch (fallo) {
        if (!controller.signal.aborted)
          setErrorCarga(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar el equipo.",
          );
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [barberiaId, token, intento]);

  async function ejecutar(accion: () => Promise<void>) {
    if (enCurso.current || !token || cargando || resultadoIncierto) return;
    enCurso.current = true;
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      await accion();
      setIntento((actual) => actual + 1);
    } catch (fallo) {
      if (!(fallo instanceof ApiError) || fallo.status >= 500) {
        setResultadoIncierto(true);
        setError(
          "No pudimos confirmar el resultado. Actualiza el equipo antes de repetir la operación. Si perdiste el enlace, genera uno nuevo para reemplazarlo.",
        );
      } else setError(fallo.message);
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!nombre.trim()) {
      setError("Escribe el nombre del profesional.");
      return;
    }
    void ejecutar(async () => {
      const nuevo = await crearProfesional(barberiaId, token!, nombre.trim());
      setNombre("");
      setProfesionalId(String(nuevo.id));
      setAviso(
        "Profesional creado. Ahora puedes invitarlo a entrar con su cuenta.",
      );
    });
  }

  function invitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!profesionalId) return;
    void ejecutar(async () => {
      setGenerada(null);
      setCopiado(false);
      const nueva = await invitarProfesional(
        barberiaId,
        token!,
        Number(profesionalId),
        email.trim().toLowerCase(),
      );
      setGenerada(nueva);
      setAviso(
        "Invitación creada. Copia el enlace y compártelo con la persona invitada.",
      );
    });
  }

  const enlace = generada
    ? `${window.location.origin}${window.location.pathname}#invitacion=${generada.token}`
    : "";
  const disponibles =
    equipo?.profesionales.filter((p) => p.activo && p.miembros.length === 0) ??
    [];
  const deshabilitado = ocupado || cargando || resultadoIncierto;

  if (profesionalHorarios) {
    return (
      <HorariosProfesional
        key={profesionalHorarios.id}
        barberiaId={barberiaId}
        nombreBarberia={nombreBarberia}
        profesional={profesionalHorarios}
        onVolver={() => setProfesionalHorarios(null)}
      />
    );
  }

  if (profesionalServicios) {
    return (
      <ServiciosProfesional
        key={profesionalServicios.id}
        barberiaId={barberiaId}
        nombreBarberia={nombreBarberia}
        profesional={profesionalServicios}
        onVolver={() => setProfesionalServicios(null)}
      />
    );
  }

  return (
    <section aria-labelledby="titulo-equipo">
      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
        disabled={ocupado}
      >
        Volver a mis negocios
      </button>
      <div className="equipo-cabecera">
        <div>
          <h2 id="titulo-equipo">Mi equipo</h2>
          <p>{nombreBarberia}</p>
        </div>
        <button
          type="button"
          className="boton-secundario"
          disabled={ocupado || cargando}
          onClick={() => setIntento((i) => i + 1)}
        >
          Actualizar equipo
        </button>
      </div>
      {aviso && (
        <p className="mensaje-exito" role="status">
          {aviso}
        </p>
      )}
      {error && <EstadoContenido tipo="error" mensaje={error} />}
      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando el equipo…" />
      ) : errorCarga ? (
        <EstadoContenido
          tipo="error"
          mensaje={errorCarga}
          onReintentar={() => setIntento((i) => i + 1)}
        />
      ) : (
        equipo && (
          <>
            <div className="equipo-formularios">
              <form
                className="formulario equipo-formulario"
                onSubmit={agregar}
                aria-busy={ocupado}
              >
                <h3>1. Crea al profesional</h3>
                <p>Su perfil puede existir antes de que tenga una cuenta.</p>
                <div className="campo">
                  <label htmlFor="equipo-nombre">Nombre del profesional</label>
                  <input
                    id="equipo-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    maxLength={100}
                    disabled={deshabilitado}
                  />
                </div>
                <button type="submit" disabled={deshabilitado}>
                  Agregar profesional
                </button>
              </form>
              <form
                className="formulario equipo-formulario"
                onSubmit={invitar}
                aria-busy={ocupado}
              >
                <h3>2. Invítalo al negocio</h3>
                <p>
                  Entrará como miembro del equipo. No podrá administrar el
                  negocio.
                </p>
                <div className="campo">
                  <label htmlFor="equipo-profesional">Profesional</label>
                  <select
                    id="equipo-profesional"
                    value={profesionalId}
                    onChange={(e) => {
                      setProfesionalId(e.target.value);
                      setGenerada(null);
                    }}
                    required
                    disabled={deshabilitado || !disponibles.length}
                  >
                    <option value="">Selecciona un profesional</option>
                    {disponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                {!disponibles.length && (
                  <p>
                    Agrega un profesional sin cuenta vinculada para poder
                    invitarlo.
                  </p>
                )}
                <div className="campo">
                  <label htmlFor="equipo-email">
                    Correo de la persona invitada
                  </label>
                  <input
                    id="equipo-email"
                    type="email"
                    autoComplete="off"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setGenerada(null);
                    }}
                    disabled={deshabilitado}
                  />
                </div>
                <p className="equipo-ayuda">
                  Válido durante 72 horas y una sola vez. Un enlace nuevo
                  reemplaza las invitaciones pendientes para ese correo o
                  profesional.
                </p>
                <button
                  type="submit"
                  disabled={
                    deshabilitado ||
                    !disponibles.some((p) => String(p.id) === profesionalId)
                  }
                >
                  Generar enlace
                </button>
              </form>
            </div>
            {generada && (
              <div className="equipo-enlace">
                <label htmlFor="enlace-invitacion">
                  Enlace para {generada.email}
                </label>
                <p>
                  Vence: {new Date(generada.venceEn).toLocaleString("es-CL")}.
                  No se envía automáticamente por correo.
                </p>
                <input
                  id="enlace-invitacion"
                  readOnly
                  value={enlace}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(enlace);
                      setCopiado(true);
                    } catch {
                      setError("Selecciona el enlace y cópialo manualmente.");
                    }
                  }}
                >
                  {copiado ? "Enlace copiado" : "Copiar enlace"}
                </button>
              </div>
            )}
            <h3>Profesionales ({equipo.profesionales.length})</h3>
            {!equipo.profesionales.length ? (
              <EstadoContenido
                tipo="vacio"
                mensaje="Tu equipo todavía no tiene profesionales."
              />
            ) : (
              <ul className="equipo-lista">
                {equipo.profesionales.map((p) => (
                  <li key={p.id} className="equipo-profesional">
                    <div className="equipo-persona">
                      <strong>{p.nombre}</strong>
                      <span>
                        {!p.activo
                          ? "Profesional inactivo"
                          : p.miembros.length
                            ? "Cuenta vinculada"
                            : "Sin cuenta vinculada"}
                      </span>
                      {p.miembros.map((m) => (
                        <span key={m.usuario.email}>
                          {m.usuario.email}
                          {!m.activo ? " · Acceso inactivo" : ""}
                        </span>
                      ))}
                    </div>
                    <div
                      className="grupo-acciones"
                      role="group"
                      aria-label={`Opciones de ${p.nombre}`}
                    >
                      <button
                        type="button"
                        className="boton-secundario"
                        disabled={deshabilitado}
                        aria-label={`Servicios de ${p.nombre}`}
                        onClick={() => setProfesionalServicios(p)}
                      >
                        Servicios
                      </button>
                      <button
                        type="button"
                        className="boton-secundario"
                        disabled={deshabilitado}
                        aria-label={`Horarios de ${p.nombre}`}
                        onClick={() => setProfesionalHorarios(p)}
                      >
                        Horarios
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <h3>Últimas invitaciones</h3>
            {!equipo.invitaciones.length ? (
              <p>Aún no has enviado invitaciones.</p>
            ) : (
              <ul className="equipo-lista">
                {equipo.invitaciones.map((i) => (
                  <li key={i.id}>
                    <strong>
                      {equipo.profesionales.find(
                        (p) => p.id === i.profesionalId,
                      )?.nombre ?? "Profesional"}
                    </strong>
                    <span>{i.email}</span>
                    <span>{etiquetas[i.estado]}</span>
                    {i.estado === "PENDIENTE" && (
                      <button
                        type="button"
                        className="boton-secundario"
                        disabled={deshabilitado}
                        onClick={() =>
                          void ejecutar(async () => {
                            await revocarInvitacion(barberiaId, token!, i.id);
                            if (generada?.id === i.id) setGenerada(null);
                            setAviso("La invitación fue revocada.");
                          })
                        }
                      >
                        Revocar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )
      )}
    </section>
  );
}
