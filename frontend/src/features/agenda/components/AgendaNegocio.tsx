import BloqueosAgenda from "./BloqueosAgenda.js";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/auth-context.js";
import { api } from "../../../shared/lib/api.js";
import { formatearPrecio } from "../../../shared/lib/formatos.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import { consultarAgenda } from "../api.js";
import type { Agenda, CitaAgenda } from "../types.js";
import "../../reservas/reservas.css";
import "../agenda.css";
import CancelarCitaEquipo from "./CancelarCitaEquipo.js";
import ReagendarCitaEquipo from "./ReagendarCitaEquipo.js";
type Props = {
  barberiaId: number;
  nombreBarberia: string;
  administrador: boolean;
  profesionalId: number | null;
  onVolver: () => void;
};
function fechaHoy(zona: string) {
  const partes = new Intl.DateTimeFormat("en", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
export default function AgendaNegocio({
  barberiaId,
  nombreBarberia,
  administrador,
  profesionalId,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const token = sesion?.accessToken;
  const [fecha, setFecha] = useState("");
  const [zona, setZona] = useState("");
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [estado, setEstado] = useState("TODAS");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [citaParaReagendar, setCitaParaReagendar] = useState<CitaAgenda | null>(
    null,
  );
  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      if (!token) return;
      setCargando(true);
      setError("");
      setAgenda(null);
      try {
        let zonaActual = zona;
        if (!zonaActual) {
          const negocio = await api<{ zonaHoraria: string }>(
            `/barberias/${barberiaId}`,
            { token, signal: controller.signal },
          );
          zonaActual = negocio.zonaHoraria;
        }
        if (controller.signal.aborted) return;
        if (!fecha || !zona) {
          setZona(zonaActual);
          setFecha(fecha || fechaHoy(zonaActual));
          return;
        }
        const datos = await consultarAgenda(
          barberiaId,
          fecha,
          token,
          controller.signal,
        );
        if (!controller.signal.aborted) setAgenda(datos);
      } catch (fallo) {
        if (!controller.signal.aborted)
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar la agenda.",
          );
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    void cargar();
    return () => controller.abort();
  }, [barberiaId, fecha, zona, token, intento]);
  const citas =
    agenda?.reservas.filter(
      (cita) => estado === "TODAS" || cita.estado === estado,
    ) ?? [];
  const hora = (iso: string) =>
    new Intl.DateTimeFormat("es-CL", {
      timeZone: agenda?.zonaHoraria || zona,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));

  useEffect(() => {
    const actualizarAhora = () => setAhora(Date.now());

    const intervalo = window.setInterval(actualizarAhora, 30_000);
    window.addEventListener("focus", actualizarAhora);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizarAhora);
    };
  }, []);

  if (citaParaReagendar) {
    return (
      <ReagendarCitaEquipo
        key={citaParaReagendar.id}
        barberiaId={barberiaId}
        reservaId={citaParaReagendar.id}
        nombreCliente={citaParaReagendar.cliente.nombre}
        nombreServicio={citaParaReagendar.nombreServicio}
        onVolver={() => {
          setCitaParaReagendar(null);
          setAgenda(null);
          setIntento((actual) => actual + 1);
        }}
        onReagendada={(mensaje) => {
          setAviso(mensaje);
          setCitaParaReagendar(null);
          setAgenda(null);
          setIntento((actual) => actual + 1);
        }}
      />
    );
  }
  return (
    <section aria-labelledby="titulo-agenda">
      <div className="negocios-cabecera">
        <div>
          <h2 id="titulo-agenda">
            {administrador ? "Agenda del negocio" : "Mi agenda"}
          </h2>
          <p>{nombreBarberia}</p>
        </div>
        <button type="button" className="boton-secundario" onClick={onVolver}>
          Volver a mis negocios
        </button>
      </div>
      <p>
        {administrador
          ? "Consulta las citas del equipo."
          : "Aquí ves únicamente las citas asignadas a tu profesional en esta barbería."}
      </p>
      {aviso && (
        <p className="mensaje-exito" role="status">
          {aviso}
        </p>
      )}
      <div className="agenda-controles">
        <label>
          Fecha
          <input
            type="date"
            value={fecha}
            disabled={!zona}
            onChange={(e) => {
              if (e.target.value) {
                setFecha(e.target.value);
                setAgenda(null);
              }
            }}
          />
        </label>
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="TODAS">Todas</option>
            <option value="CONFIRMADA">Confirmadas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </label>
        <div className="grupo-acciones">
          <button
            type="button"
            className="boton-secundario"
            disabled={!zona}
            onClick={() => {
              setFecha(fechaHoy(zona));
              setAgenda(null);
              setIntento((i) => i + 1);
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            className="boton-secundario"
            disabled={cargando}
            onClick={() => setIntento((i) => i + 1)}
          >
            Actualizar
          </button>
        </div>
      </div>
      {zona && (
        <p className="nota-resumen">
          Horas de la barbería · {zona}. Ordenadas desde la primera cita del
          día.
        </p>
      )}
      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando la agenda…" />
      ) : error ? (
        <EstadoContenido
          tipo="error"
          mensaje={error}
          onReintentar={() => setIntento((i) => i + 1)}
        />
      ) : citas.length === 0 ? (
        <EstadoContenido
          tipo="vacio"
          mensaje="No hay citas para esta fecha y estado."
        />
      ) : (
        <>
          <p role="status">
            {citas.length} {citas.length === 1 ? "cita" : "citas"}
          </p>
          <div
            className="agenda-tabla"
            tabIndex={0}
            role="region"
            aria-label="Citas del día"
          >
            <table className="tabla-reservas">
              <caption className="solo-lectores">Agenda del {fecha}</caption>
              <thead>
                <tr>
                  <th scope="col">Hora</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Servicio</th>
                  {administrador && <th scope="col">Profesional</th>}
                  <th scope="col">Precio</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita) => (
                  <tr key={cita.id}>
                    <td>
                      <time dateTime={cita.inicio}>{hora(cita.inicio)}</time> –{" "}
                      <time dateTime={cita.fin}>{hora(cita.fin)}</time>
                    </td>
                    <td>{cita.cliente.nombre}</td>
                    <td>
                      <strong>{cita.nombreServicio}</strong>
                      <small>{cita.duracionMinutos} minutos</small>
                    </td>
                    {administrador && <td>{cita.profesional.nombre}</td>}
                    <td>{formatearPrecio(cita.precioAcordado)}</td>
                    <td>
                      <span
                        className={`estado-reserva ${cita.estado === "CONFIRMADA" ? "estado-confirmada" : "estado-cancelada"}`}
                      >
                        {cita.estado === "CONFIRMADA"
                          ? "Confirmada"
                          : "Cancelada"}
                      </span>
                    </td>
                    <td>
                      {cita.estado === "CONFIRMADA" &&
                      new Date(cita.inicio).getTime() > ahora ? (
                        <div className="grupo-acciones">
                          <button
                            type="button"
                            className="boton-secundario"
                            onClick={() => {
                              setAviso("");
                              setCitaParaReagendar(cita);
                            }}
                          >
                            Reagendar
                          </button>

                          <CancelarCitaEquipo
                            barberiaId={barberiaId}
                            reservaId={cita.id}
                            nombreCliente={cita.cliente.nombre}
                            onCancelada={() => {
                              setAviso(
                                "La cita fue cancelada y el motivo quedó registrado.",
                              );
                              setAgenda(null);
                              setIntento((actual) => actual + 1);
                            }}
                          />
                        </div>
                      ) : (
                        <span className="nota-resumen">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {zona && fecha && (
        <BloqueosAgenda
          key={`${barberiaId}:${fecha}:${intento}`}
          barberiaId={barberiaId}
          profesionalId={profesionalId}
          administrador={administrador}
          zona={zona}
          fecha={fecha}
        />
      )}
      {!administrador && (
        <p className="nota-resumen">
          Coordina con el cliente antes de cancelar o reagendar sus citas. Para
          modificar tus horarios o servicios, contacta al administrador. Tus
          reservas personales están en el espacio Clientes.
        </p>
      )}
    </section>
  );
}
