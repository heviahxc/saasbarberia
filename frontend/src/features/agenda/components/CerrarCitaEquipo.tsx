import { useRef, useState } from "react";
import { useAuth } from "../../auth/auth-context.js";
import { api, ApiError } from "../../../shared/lib/api.js";
import { estadosReserva } from "../../../shared/lib/estados-reserva.js";
type Resultado = "ATENDIDA" | "NO_ASISTIO";
type Props = {
  barberiaId: number;
  reservaId: number;
  nombreCliente: string;
  onCerrada: (mensaje: string) => void;
};
export default function CerrarCitaEquipo({
  barberiaId,
  reservaId,
  nombreCliente,
  onCerrada,
}: Props) {
  const { sesion } = useAuth();
  const [seleccion, setSeleccion] = useState<Resultado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [incierto, setIncierto] = useState(false);
  const enCurso = useRef(false);
  async function confirmar() {
    if (!sesion || !seleccion || enCurso.current || incierto) return;
    enCurso.current = true;
    setGuardando(true);
    setError("");
    try {
      await api(`/barberias/${barberiaId}/reservas/${reservaId}/cierre`, {
        method: "PATCH",
        token: sesion.accessToken,
        body: { estado: seleccion },
      });
      onCerrada(
        `La cita de ${nombreCliente} quedó marcada como ${estadosReserva[seleccion].etiqueta.toLowerCase()}.`,
      );
    } catch (fallo) {
      if (fallo instanceof ApiError && fallo.status < 500)
        setError(fallo.message);
      else {
        setIncierto(true);
        setError(
          "No pudimos confirmar el resultado. Actualiza la agenda antes de intentar otro cierre.",
        );
      }
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }
  return (
    <div className="cierre-cita">
      {!seleccion ? (
        <div className="grupo-acciones">
          <button
            type="button"
            className="boton-secundario"
            onClick={() => setSeleccion("ATENDIDA")}
          >
            Marcar atendida
          </button>
          <button
            type="button"
            className="boton-secundario"
            onClick={() => setSeleccion("NO_ASISTIO")}
          >
            No asistió
          </button>
        </div>
      ) : (
        <>
          <p>
            ¿Marcar la cita de <strong>{nombreCliente}</strong> como{" "}
            <strong>{estadosReserva[seleccion].etiqueta}</strong>?
          </p>
          <p className="nota-resumen">
            El cierre quedará registrado con tu cuenta. No se puede cambiar
            desde esta pantalla.
          </p>
          <div className="grupo-acciones">
            <button
              type="button"
              disabled={guardando || incierto}
              onClick={() => void confirmar()}
            >
              {guardando ? "Guardando…" : "Confirmar cierre"}
            </button>
            <button
              type="button"
              className="boton-secundario"
              disabled={guardando || incierto}
              onClick={() => {
                setSeleccion(null);
                setError("");
              }}
            >
              Volver
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="mensaje-error">
          {error}
        </p>
      )}
    </div>
  );
}
