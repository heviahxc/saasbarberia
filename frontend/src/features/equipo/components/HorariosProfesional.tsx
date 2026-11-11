import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../auth/auth-context.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { api, ApiError } from "../../../shared/lib/api.js";
import type { Negocio } from "../../negocios/types.js";
import { agregarHorario, consultarHorarios, eliminarHorario } from "../api.js";
import type { HorarioProfesional } from "../types.js";
import "../equipo.css";

const dias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
function minutos(hora: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return NaN;
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
function hora(minuto: number) {
  return `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`;
}
type Props = {
  barberiaId: number;
  nombreBarberia: string;
  profesional: { id: number; nombre: string };
  onVolver: () => void;
};

export default function HorariosProfesional({
  barberiaId,
  nombreBarberia,
  profesional,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;
  const [horarios, setHorarios] = useState<HorarioProfesional[]>([]);
  const [zona, setZona] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  const [dia, setDia] = useState("1");
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("13:00");
  const [medianoche, setMedianoche] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      if (!token) return;
      setCargando(true);
      setErrorCarga("");
      try {
        const [lista, negocio] = await Promise.all([
          consultarHorarios(
            barberiaId,
            profesional.id,
            token,
            controller.signal,
          ),
          api<Negocio>(`/barberias/${barberiaId}`, {
            token,
            signal: controller.signal,
          }),
        ]);
        if (!controller.signal.aborted) {
          setHorarios(lista);
          setZona(negocio.zonaHoraria);
          setBloqueado(false);
        }
      } catch (fallo) {
        if (!controller.signal.aborted)
          setErrorCarga(
            fallo instanceof Error
              ? fallo.message
              : "No se pudieron cargar los horarios.",
          );
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [barberiaId, profesional.id, token, intento]);

  async function ejecutar(accion: () => Promise<void>) {
    if (!token || enCurso.current || bloqueado || cargando) return;
    enCurso.current = true;
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      await accion();
    } catch (fallo) {
      if (!(fallo instanceof ApiError) || fallo.status >= 500) {
        setBloqueado(true);
        setError(
          "No pudimos confirmar el cambio. Actualiza los horarios antes de repetir la operación.",
        );
      } else {
        setError(fallo.message);
        if ([401, 403, 404].includes(fallo.status)) setBloqueado(true);
      }
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = {
      diaSemana: Number(dia),
      inicioMinuto: minutos(inicio),
      finMinuto: medianoche ? 1440 : minutos(fin),
    };
    if (
      !Number.isFinite(datos.inicioMinuto) ||
      !Number.isFinite(datos.finMinuto) ||
      datos.inicioMinuto >= datos.finMinuto
    ) {
      setError(
        "La hora de término debe ser posterior al inicio dentro del mismo día.",
      );
      return;
    }
    if (
      horarios.some(
        (h) =>
          h.diaSemana === datos.diaSemana &&
          h.inicioMinuto < datos.finMinuto &&
          h.finMinuto > datos.inicioMinuto,
      )
    ) {
      setError("Ese tramo se superpone con otro horario del mismo día.");
      return;
    }
    void ejecutar(async () => {
      const nuevo = await agregarHorario(
        barberiaId,
        profesional.id,
        token!,
        datos,
      );
      setHorarios((actual) => [...actual, nuevo]);
      setAviso(
        `Horario agregado: ${dias[datos.diaSemana - 1]}, ${hora(datos.inicioMinuto)}–${hora(datos.finMinuto)}.`,
      );
    });
  }
  async function quitar(h: HorarioProfesional) {
    await ejecutar(async () => {
      await eliminarHorario(barberiaId, profesional.id, h.id, token!);
      setHorarios((actual) => actual.filter((t) => t.id !== h.id));
      setAviso(
        `Tramo eliminado: ${dias[h.diaSemana - 1]}, ${hora(h.inicioMinuto)}–${hora(h.finMinuto)}.`,
      );
    });
  }
  const deshabilitado = guardando || bloqueado || cargando;

  return (
    <section aria-labelledby="titulo-horarios">
      <button
        type="button"
        className="boton-secundario volver"
        disabled={guardando}
        onClick={onVolver}
      >
        Volver a mi equipo
      </button>
      <div className="equipo-cabecera">
        <div>
          <h2 id="titulo-horarios">Horarios de {profesional.nombre}</h2>
          <p>{nombreBarberia}</p>
        </div>
        <button
          type="button"
          className="boton-secundario"
          disabled={guardando || cargando}
          onClick={() => {
            setError("");
            setIntento((i) => i + 1);
          }}
        >
          Actualizar horarios
        </button>
      </div>
      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando horarios…" />
      ) : errorCarga ? (
        <EstadoContenido
          tipo="error"
          mensaje={errorCarga}
          onReintentar={() => setIntento((i) => i + 1)}
        />
      ) : (
        <>
          <p>
            Horario semanal recurrente. Todas las horas corresponden a{" "}
            <strong>{zona}</strong>.
          </p>
          <p className="equipo-ayuda">
            Puedes agregar varios tramos por día. Para un descanso, usa por
            ejemplo 09:00–13:00 y 14:00–18:00. Los días sin tramos no ofrecen
            horas para reservar.
          </p>
          {aviso && (
            <p className="mensaje-exito" role="status">
              {aviso}
            </p>
          )}
          {error && <EstadoContenido tipo="error" mensaje={error} />}
          <form
            className="formulario equipo-formulario horarios-formulario"
            onSubmit={agregar}
            aria-busy={guardando}
          >
            <h3>Agregar tramo</h3>
            <div className="horarios-campos">
              <div className="campo">
                <label htmlFor="horario-dia">Día</label>
                <select
                  id="horario-dia"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  disabled={deshabilitado}
                >
                  {dias.map((d, i) => (
                    <option key={d} value={i + 1}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="horario-inicio">Desde</label>
                <input
                  id="horario-inicio"
                  type="time"
                  step={60}
                  required
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  disabled={deshabilitado}
                />
              </div>
              <div className="campo">
                <label htmlFor="horario-fin">Hasta</label>
                <input
                  id="horario-fin"
                  type="time"
                  step={60}
                  required={!medianoche}
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  disabled={deshabilitado || medianoche}
                />
              </div>
            </div>
            <label className="horarios-medianoche">
              <input
                type="checkbox"
                checked={medianoche}
                onChange={(e) => setMedianoche(e.target.checked)}
                disabled={deshabilitado}
              />
              Termina a medianoche (24:00)
            </label>
            <button type="submit" disabled={deshabilitado}>
              {guardando ? "Guardando…" : "Agregar tramo"}
            </button>
          </form>
          <h3>Semana de trabajo</h3>
          <p className="equipo-ayuda">
            Para cambiar un tramo, elimínalo y agrega el nuevo. La regla actual
            impide eliminar horarios si el profesional tiene cualquier reserva
            confirmada pendiente o en curso.
          </p>
          <SemanaHorarios
            horarios={horarios}
            disabled={deshabilitado}
            onQuitar={quitar}
          />
        </>
      )}
    </section>
  );
}

function SemanaHorarios({
  horarios,
  disabled,
  onQuitar,
}: {
  horarios: HorarioProfesional[];
  disabled: boolean;
  onQuitar: (h: HorarioProfesional) => Promise<void>;
}) {
  return (
    <div className="horarios-semana">
      {dias.map((d, i) => {
        const tramos = horarios
          .filter((h) => h.diaSemana === i + 1)
          .sort((a, b) => a.inicioMinuto - b.inicioMinuto);
        return (
          <section className="horarios-dia" key={d} aria-label={d}>
            <h4>{d}</h4>
            {!tramos.length ? (
              <p>Sin atención</p>
            ) : (
              <ul className="equipo-lista">
                {tramos.map((h) => (
                  <li key={h.id}>
                    <strong>
                      {hora(h.inicioMinuto)}–{hora(h.finMinuto)}
                    </strong>
                    <button
                      type="button"
                      className="boton-secundario"
                      disabled={disabled}
                      aria-label={`Eliminar ${d} ${hora(h.inicioMinuto)} a ${hora(h.finMinuto)}`}
                      onClick={() => void onQuitar(h)}
                    >
                      Eliminar tramo
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
