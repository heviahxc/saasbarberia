import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/auth-context.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { ApiError } from "../../../shared/lib/api.js";
import { formatearPrecio } from "../../../shared/lib/formatos.js";
import { cambiarEstadoServicio, consultarServicios } from "../api.js";
import type { ServicioNegocio } from "../types.js";
import FormularioServicio from "./FormularioServicio.js";
import "../servicios.css";

type Props = {
  barberiaId: number;
  nombreBarberia: string;
  onVolver: () => void;
};
type Filtro = "todos" | "activos" | "inactivos";
export default function ServiciosNegocio({
  barberiaId,
  nombreBarberia,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;
  const [servicios, setServicios] = useState<ServicioNegocio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editor, setEditor] = useState<"nuevo" | ServicioNegocio | null>(null);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    const controlador = new AbortController();
    async function cargar() {
      if (!token) return;
      setCargando(true);
      setErrorCarga("");
      try {
        const datos = await consultarServicios(
          barberiaId,
          token,
          controlador.signal,
        );
        if (!controlador.signal.aborted) {
          setServicios(datos);
          setBloqueado(false);
        }
      } catch (fallo) {
        if (!controlador.signal.aborted)
          setErrorCarga(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar el listado.",
          );
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controlador.abort();
  }, [barberiaId, token, intento]);

  async function cambiarEstado(servicio: ServicioNegocio) {
    if (!token || enCurso.current || bloqueado) return;
    enCurso.current = true;
    setCambiando(servicio.id);
    setError("");
    setAviso("");
    try {
      const resultado = await cambiarEstadoServicio(
        barberiaId,
        token,
        servicio.id,
        !servicio.activo,
      );
      setServicios((actuales) =>
        actuales.map((s) =>
          s.id === servicio.id ? { ...s, activo: resultado.activo } : s,
        ),
      );
      setAviso(
        `${servicio.nombre}: ${resultado.activo ? "servicio activado" : "servicio desactivado"}.`,
      );
    } catch (fallo) {
      setBloqueado(true);
      setError(
        fallo instanceof ApiError && fallo.status < 500
          ? fallo.message
          : "No pudimos confirmar el cambio. Actualiza el listado antes de intentarlo nuevamente.",
      );
    } finally {
      enCurso.current = false;
      setCambiando(null);
    }
  }
  function volverAlListado() {
    setEditor(null);
    setIntento((i) => i + 1);
  }
  const visibles = servicios.filter(
    (s) => filtro === "todos" || (filtro === "activos" ? s.activo : !s.activo),
  );
  const ocupado = cargando || cambiando !== null;

  return (
    <section aria-labelledby="titulo-servicios-negocio">
      {editor === null && (
        <button
          type="button"
          className="boton-secundario volver"
          disabled={cambiando !== null}
          onClick={onVolver}
        >
          Volver a mis negocios
        </button>
      )}
      <div className="servicios-cabecera">
        <div>
          <h2 id="titulo-servicios-negocio">Servicios</h2>
          <p>{nombreBarberia}</p>
        </div>
        {editor === null && (
          <div className="servicios-acciones">
            <button
              type="button"
              className="boton-secundario"
              disabled={ocupado}
              onClick={() => {
                setError("");
                setIntento((i) => i + 1);
              }}
            >
              Actualizar
            </button>
            <button
              type="button"
              disabled={ocupado || bloqueado || !!errorCarga}
              onClick={() => {
                setAviso("");
                setError("");
                setEditor("nuevo");
              }}
            >
              Nuevo servicio
            </button>
          </div>
        )}
      </div>
      {editor !== null ? (
        <FormularioServicio
          key={editor === "nuevo" ? "nuevo" : editor.id}
          barberiaId={barberiaId}
          servicio={editor === "nuevo" ? undefined : editor}
          onVolver={volverAlListado}
          onGuardado={(s) => {
            setAviso(
              `El servicio ${s.nombre} fue ${editor === "nuevo" ? "creado" : "actualizado"}.`,
            );
            setFiltro("todos");
            volverAlListado();
          }}
        />
      ) : (
        <>
          <p className="servicios-nota">
            Desactivar un servicio lo oculta del catálogo para nuevas reservas.
            No cancela las citas existentes.
          </p>
          {aviso && (
            <p className="mensaje-exito" role="status">
              {aviso}
            </p>
          )}
          {error && <EstadoContenido tipo="error" mensaje={error} />}
          {cargando ? (
            <EstadoContenido tipo="cargando" mensaje="Consultando servicios…" />
          ) : errorCarga ? (
            <EstadoContenido
              tipo="error"
              mensaje={errorCarga}
              onReintentar={() => setIntento((i) => i + 1)}
            />
          ) : (
            <>
              <div
                className="servicios-filtros"
                role="group"
                aria-label="Filtrar servicios por estado"
              >
                {(
                  [
                    { id: "todos", texto: "Todos", cantidad: servicios.length },
                    {
                      id: "activos",
                      texto: "Activos",
                      cantidad: servicios.filter((s) => s.activo).length,
                    },
                    {
                      id: "inactivos",
                      texto: "Inactivos",
                      cantidad: servicios.filter((s) => !s.activo).length,
                    },
                  ] as const
                ).map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    className="boton-secundario"
                    aria-pressed={filtro === f.id}
                    onClick={() => setFiltro(f.id)}
                  >
                    {f.texto} ({f.cantidad})
                  </button>
                ))}
              </div>
              {!visibles.length ? (
                <EstadoContenido
                  tipo="vacio"
                  mensaje={
                    servicios.length
                      ? "No hay servicios con este estado."
                      : "Crea el primer servicio de tu barbería."
                  }
                />
              ) : (
                <div
                  className="servicios-tabla-contenedor"
                  role="region"
                  aria-label="Listado de servicios"
                  tabIndex={0}
                >
                  <table className="servicios-tabla">
                    <caption className="solo-lectores">
                      Servicios de {nombreBarberia}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Servicio</th>
                        <th scope="col">Duración</th>
                        <th scope="col">Precio</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((s) => (
                        <tr key={s.id}>
                          <th scope="row">{s.nombre}</th>
                          <td>{s.duracionMinutos} min</td>
                          <td>{formatearPrecio(s.precio)}</td>
                          <td>
                            <span
                              className={`servicio-estado ${s.activo ? "servicio-activo" : "servicio-inactivo"}`}
                            >
                              {s.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div className="servicios-acciones">
                              <button
                                type="button"
                                className="boton-secundario"
                                disabled={ocupado || bloqueado}
                                aria-label={`Editar ${s.nombre}`}
                                onClick={() => {
                                  setAviso("");
                                  setError("");
                                  setEditor(s);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="boton-secundario"
                                disabled={ocupado || bloqueado}
                                aria-label={`${s.activo ? "Desactivar" : "Activar"} ${s.nombre}`}
                                onClick={() => void cambiarEstado(s)}
                              >
                                {cambiando === s.id
                                  ? "Guardando…"
                                  : s.activo
                                    ? "Desactivar"
                                    : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
