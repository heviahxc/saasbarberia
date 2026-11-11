import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/auth-context.js";
import { consultarServicios } from "../../servicios/api.js";
import type { ServicioNegocio } from "../../servicios/types.js";
import {
  consultarServiciosProfesional,
  asignarServicioProfesional,
  quitarServicioProfesional,
} from "../api.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { ApiError } from "../../../shared/lib/api.js";
import { formatearPrecio } from "../../../shared/lib/formatos.js";
import "../../servicios/servicios.css";

type Props = {
  barberiaId: number;
  nombreBarberia: string;
  profesional: { id: number; nombre: string };
  onVolver: () => void;
};

export default function ServiciosProfesional({
  barberiaId,
  nombreBarberia,
  profesional,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;
  const [servicios, setServicios] = useState<ServicioNegocio[]>([]);
  const [asignados, setAsignados] = useState<ServicioNegocio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      if (!token) return;
      setCargando(true);
      setErrorCarga("");
      try {
        const [lista, vinculados] = await Promise.all([
          consultarServicios(barberiaId, token, controller.signal),
          consultarServiciosProfesional(
            barberiaId,
            profesional.id,
            token,
            controller.signal,
          ),
        ]);
        if (!controller.signal.aborted) {
          setServicios(lista);
          setAsignados(vinculados);
          setBloqueado(false);
        }
      } catch (fallo) {
        if (!controller.signal.aborted)
          setErrorCarga(
            fallo instanceof Error
              ? fallo.message
              : "No se pudieron consultar las asignaciones.",
          );
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [barberiaId, profesional.id, token, intento]);

  async function cambiar(servicio: ServicioNegocio, quitar: boolean) {
    if (!token || enCurso.current || bloqueado || cargando) return;
    enCurso.current = true;
    setGuardando(servicio.id);
    setError("");
    setAviso("");
    try {
      if (quitar) {
        await quitarServicioProfesional(
          barberiaId,
          profesional.id,
          servicio.id,
          token,
        );
        setAsignados((actual) => actual.filter((s) => s.id !== servicio.id));
      } else {
        await asignarServicioProfesional(
          barberiaId,
          profesional.id,
          servicio.id,
          token,
        );
        setAsignados((actual) => [...actual, servicio]);
      }
      setAviso(
        quitar
          ? `${servicio.nombre} ya no está asignado a ${profesional.nombre}. Las reservas existentes se conservan.`
          : `${servicio.nombre} fue asignado a ${profesional.nombre}.`,
      );
    } catch (fallo) {
      setBloqueado(true);
      setError(
        fallo instanceof ApiError && fallo.status < 500
          ? `${fallo.message}. Actualiza el listado para comprobar las asignaciones.`
          : "No pudimos confirmar el resultado. Actualiza el listado antes de repetir la operación.",
      );
    } finally {
      enCurso.current = false;
      setGuardando(null);
    }
  }

  const disponibles = servicios.filter(
    (s) => s.activo && !asignados.some((a) => a.id === s.id),
  );

  return (
    <section aria-labelledby="titulo-servicios-profesional">
      <button
        type="button"
        className="boton-secundario volver"
        disabled={guardando !== null}
        onClick={onVolver}
      >
        Volver a mi equipo
      </button>
      <div className="equipo-cabecera">
        <div>
          <h2 id="titulo-servicios-profesional">
            Servicios de {profesional.nombre}
          </h2>
          <p>{nombreBarberia}</p>
        </div>
        <button
          type="button"
          className="boton-secundario"
          disabled={cargando || guardando !== null}
          onClick={() => {
            setError("");
            setIntento((i) => i + 1);
          }}
        >
          Actualizar
        </button>
      </div>
      <p className="servicios-nota">
        Los cambios se guardan al pulsar cada botón. Quitar una asignación no
        borra el servicio ni cancela las reservas existentes.
      </p>
      {aviso && (
        <p className="mensaje-exito" role="status">
          {aviso}
        </p>
      )}
      {error && <EstadoContenido tipo="error" mensaje={error} />}
      {cargando ? (
        <EstadoContenido
          tipo="cargando"
          mensaje="Consultando servicios y asignaciones…"
        />
      ) : errorCarga ? (
        <EstadoContenido
          tipo="error"
          mensaje={errorCarga}
          onReintentar={() => setIntento((i) => i + 1)}
        />
      ) : (
        <>
          <h3>Servicios asignados ({asignados.length})</h3>
          {asignados.length ? (
            <ListadoAsignaciones
              lista={asignados}
              quitar={true}
              guardando={guardando}
              bloqueado={bloqueado}
              onCambiar={cambiar}
            />
          ) : (
            <EstadoContenido
              tipo="vacio"
              mensaje="Este profesional todavía no tiene servicios asignados."
            />
          )}
          <h3>Disponibles para asignar ({disponibles.length})</h3>
          {disponibles.length ? (
            <ListadoAsignaciones
              lista={disponibles}
              quitar={false}
              guardando={guardando}
              bloqueado={bloqueado}
              onCambiar={cambiar}
            />
          ) : (
            <EstadoContenido
              tipo="vacio"
              mensaje={
                servicios.some((s) => s.activo)
                  ? "Todos los servicios activos ya están asignados."
                  : "No hay servicios activos. Puedes crearlos o activarlos desde Servicios del negocio."
              }
            />
          )}
          <p className="servicios-nota">
            Para recibir reservas, el profesional también debe estar activo y
            tener horarios disponibles.
          </p>
        </>
      )}
    </section>
  );
}

function ListadoAsignaciones({
  lista,
  quitar,
  guardando,
  bloqueado,
  onCambiar,
}: {
  lista: ServicioNegocio[];
  quitar: boolean;
  guardando: number | null;
  bloqueado: boolean;
  onCambiar: (servicio: ServicioNegocio, quitar: boolean) => Promise<void>;
}) {
  return (
    <ul className="equipo-lista">
      {lista.map((s) => (
        <li key={s.id}>
          <strong>{s.nombre}</strong>
          <span>
            {s.duracionMinutos} min · {formatearPrecio(s.precio)}
          </span>
          {!s.activo && <span>Inactivo · no admite nuevas reservas</span>}
          <button
            type="button"
            className="boton-secundario"
            disabled={guardando !== null || bloqueado}
            aria-label={`${quitar ? "Quitar" : "Asignar"} ${s.nombre}`}
            onClick={() => void onCambiar(s, quitar)}
          >
            {guardando === s.id
              ? "Guardando…"
              : quitar
                ? "Quitar asignación"
                : "Asignar"}
          </button>
        </li>
      ))}
    </ul>
  );
}
