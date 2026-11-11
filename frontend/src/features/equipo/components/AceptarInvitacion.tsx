import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/auth-context.js";
import AccesoCuenta from "../../auth/components/AccesoCuenta.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { ApiError } from "../../../shared/lib/api.js";
import { aceptarInvitacion, consultarInvitacion } from "../api.js";
import type { DetalleInvitacion } from "../types.js";

type Props = { invitacion: string; onSalir: () => void };
export default function AceptarInvitacion({ invitacion, onSalir }: Props) {
  const { sesion, avisoAcceso, iniciarSesion, cerrarSesion } = useAuth();
  return (
    <main className="contenedor">
      <section className="tarjeta">
        <p className="etiqueta">BARBER SAAS · INVITACIÓN AL EQUIPO</p>
        {!/^[a-f0-9]{64}$/.test(invitacion) ? (
          <>
            <EstadoContenido
              tipo="error"
              mensaje="El enlace de invitación no es válido. Pide uno nuevo al administrador."
            />
            <button type="button" onClick={onSalir}>
              Volver al inicio
            </button>
          </>
        ) : !sesion ? (
          <>
            <p>
              Inicia sesión o regístrate con el correo al que te invitaron.
              Después podrás revisar y aceptar la invitación.
            </p>
            <AccesoCuenta
              area="negocio"
              avisoInicial={avisoAcceso}
              onSesionIniciada={iniciarSesion}
            />
            <button
              type="button"
              className="boton-secundario"
              onClick={onSalir}
            >
              Salir de la invitación
            </button>
          </>
        ) : (
          <ConfirmarInvitacion
            key={`${sesion.usuario.id}:${invitacion}`}
            invitacion={invitacion}
            token={sesion.accessToken}
            email={sesion.usuario.email}
            onSalir={onSalir}
            onCambiarCuenta={cerrarSesion}
          />
        )}
      </section>
    </main>
  );
}

function ConfirmarInvitacion({
  invitacion,
  token,
  email,
  onSalir,
  onCambiarCuenta,
}: Props & { token: string; email: string; onCambiarCuenta: () => void }) {
  const [detalle, setDetalle] = useState<DetalleInvitacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aceptada, setAceptada] = useState(false);
  const [intento, setIntento] = useState(0);
  const [incierto, setIncierto] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      setCargando(true);
      setError("");
      setDetalle(null);
      try {
        const datos = await consultarInvitacion(
          invitacion,
          token,
          controller.signal,
        );
        if (!controller.signal.aborted) setDetalle(datos);
      } catch (fallo) {
        if (!controller.signal.aborted)
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo consultar la invitación.",
          );
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [invitacion, token, intento]);

  async function aceptar() {
    if (enCurso.current || !detalle || incierto) return;
    enCurso.current = true;
    setGuardando(true);
    setError("");
    try {
      await aceptarInvitacion(invitacion, token);
      setAceptada(true);
    } catch (fallo) {
      if (!(fallo instanceof ApiError) || fallo.status >= 500) {
        setIncierto(true);
        setError(
          "No pudimos confirmar el resultado. Entra a Mis negocios para comprobar si ya formas parte del equipo.",
        );
      } else {
        setDetalle(null);
        setError(fallo.message);
      }
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <>
      <h1>{aceptada ? "Ya formas parte del equipo" : "Únete al equipo"}</h1>
      <p>Cuenta actual: {email}</p>
      {aceptada ? (
        <p className="mensaje-exito" role="status">
          Tu cuenta quedó vinculada al profesional de esta barbería, con rol de
          miembro.
        </p>
      ) : (
        <>
          {cargando && (
            <EstadoContenido
              tipo="cargando"
              mensaje="Revisando la invitación…"
            />
          )}
          {error && (
            <EstadoContenido
              tipo="error"
              mensaje={error}
              onReintentar={
                !incierto && !guardando
                  ? () => setIntento((i) => i + 1)
                  : undefined
              }
            />
          )}
          {detalle && (
            <>
              <h2>{detalle.barberia}</h2>
              <p>
                Profesional: <strong>{detalle.profesional}</strong>
              </p>
              <p>Vence: {new Date(detalle.venceEn).toLocaleString("es-CL")}</p>
              <p>
                Tendrás acceso como miembro. Podrás seguir haciendo reservas
                personales con la misma cuenta.
              </p>
              <button
                type="button"
                disabled={guardando || incierto}
                onClick={() => void aceptar()}
              >
                {guardando ? "Aceptando…" : "Aceptar invitación"}
              </button>
            </>
          )}
          <button
            type="button"
            className="boton-secundario"
            disabled={guardando}
            onClick={onCambiarCuenta}
          >
            Usar otra cuenta
          </button>
        </>
      )}
      <button
        type="button"
        className="boton-secundario"
        disabled={guardando}
        onClick={onSalir}
      >
        {aceptada || incierto ? "Ir a mis negocios" : "Salir de la invitación"}
      </button>
    </>
  );
}
