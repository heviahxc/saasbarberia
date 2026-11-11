import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../auth/auth-context.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { ApiError } from "../../../shared/lib/api.js";
import { guardarServicio } from "../api.js";
import type { ServicioNegocio } from "../types.js";

type Props = {
  barberiaId: number;
  servicio?: ServicioNegocio;
  onGuardado: (servicio: ServicioNegocio) => void;
  onVolver: () => void;
};

export default function FormularioServicio({
  barberiaId,
  servicio,
  onGuardado,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const [nombre, setNombre] = useState(servicio?.nombre ?? "");
  const [duracion, setDuracion] = useState(
    String(servicio?.duracionMinutos ?? 30),
  );
  const [precio, setPrecio] = useState(servicio?.precio ?? "");
  const [guardando, setGuardando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [error, setError] = useState("");
  const enviando = useRef(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!sesion || enviando.current || bloqueado) return;
    const datos = {
      nombre: nombre.normalize("NFC").trim().replace(/\s+/gu, " "),
      duracionMinutos: Number(duracion),
      precio: precio.trim().replace(",", "."),
    };
    if (!datos.nombre || datos.nombre.length > 100) {
      setError("Escribe un nombre de hasta 100 caracteres.");
      return;
    }
    if (
      !/^\d+$/.test(duracion) ||
      !Number.isInteger(datos.duracionMinutos) ||
      datos.duracionMinutos < 1 ||
      datos.duracionMinutos > 1440
    ) {
      setError("La duración debe ser un número entero entre 1 y 1440 minutos.");
      return;
    }
    if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(datos.precio)) {
      setError(
        "Ingresa un precio entre 0 y 99999999,99, sin separadores de miles y con máximo dos decimales.",
      );
      return;
    }
    enviando.current = true;
    setGuardando(true);
    setError("");
    try {
      const resultado = await guardarServicio(
        barberiaId,
        sesion.accessToken,
        datos,
        servicio?.id,
      );
      onGuardado(resultado);
    } catch (fallo) {
      if (!(fallo instanceof ApiError) || fallo.status >= 500) {
        setBloqueado(true);
        setError(
          "No pudimos confirmar si se guardó. Vuelve al listado y actualiza antes de repetir la operación.",
        );
      } else {
        setError(fallo.message);
        if ([401, 403, 404].includes(fallo.status)) setBloqueado(true);
      }
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-formulario-servicio">
      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
        disabled={guardando}
      >
        Volver a servicios
      </button>
      <h3 id="titulo-formulario-servicio">
        {servicio ? "Editar servicio" : "Nuevo servicio"}
      </h3>
      <form
        className="formulario servicios-formulario"
        onSubmit={guardar}
        aria-busy={guardando}
      >
        <div className="campo">
          <label htmlFor="servicio-nombre">Nombre del servicio</label>
          <input
            id="servicio-nombre"
            autoFocus
            required
            maxLength={100}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={guardando || bloqueado}
          />
        </div>
        <div className="servicios-campos">
          <div className="campo">
            <label htmlFor="servicio-duracion">Duración (minutos)</label>
            <input
              id="servicio-duracion"
              type="number"
              required
              min={1}
              max={1440}
              step={1}
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              disabled={guardando || bloqueado}
            />
          </div>
          <div className="campo">
            <label htmlFor="servicio-precio">Precio (CLP)</label>
            <input
              id="servicio-precio"
              type="text"
              inputMode="decimal"
              required
              maxLength={11}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              aria-describedby="ayuda-precio"
              disabled={guardando || bloqueado}
            />
            <small id="ayuda-precio">
              Sin separadores de miles. Ejemplo: 15000 o 15000,50.
            </small>
          </div>
        </div>
        <p className="servicios-nota">
          {servicio
            ? "Las reservas existentes conservan el nombre, precio y duración acordados."
            : "Se creará activo. Para recibir reservas, luego debes asignarlo a un profesional con horarios disponibles."}
        </p>
        {error && <EstadoContenido tipo="error" mensaje={error} />}
        <div className="servicios-acciones">
          <button type="submit" disabled={guardando || bloqueado}>
            {guardando
              ? "Guardando…"
              : servicio
                ? "Guardar cambios"
                : "Crear servicio"}
          </button>
          <button
            type="button"
            className="boton-secundario"
            disabled={guardando}
            onClick={onVolver}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
