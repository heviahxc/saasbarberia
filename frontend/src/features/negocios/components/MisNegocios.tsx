import AgendaNegocio from "../../agenda/components/AgendaNegocio.js";
import ServiciosNegocio from "../../servicios/components/ServiciosNegocio.js";
import MiEquipo from "../../equipo/components/MiEquipo.js";
import CrearNegocio from "./CrearNegocio.js";
import { useEffect, useState } from "react";

import { useAuth } from "../../auth/auth-context.js";
import { api } from "../../../shared/lib/api.js";
import EstadoContenido from "../../../shared/components/EstadoContenido.js";
import type { MembresiaNegocio } from "../types.js";
import "../negocios.css";
import EditarNegocio from "./EditarNegocio.js";
export default function MisNegocios() {
  const { sesion } = useAuth();
  const [agendaSeleccionada, setAgendaSeleccionada] =
    useState<MembresiaNegocio | null>(null);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState("");
  const accessToken = sesion?.accessToken;
  const [membresias, setMembresias] = useState<MembresiaNegocio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [barberiaSeleccionada, setBarberiaSeleccionada] = useState<
    number | null
  >(null);
  useEffect(() => {
    const controlador = new AbortController();

    async function cargarNegocios() {
      if (!accessToken) return;

      setCargando(true);
      setError("");

      try {
        const datos = await api<MembresiaNegocio[]>("/auth/me/barberias", {
          token: accessToken,
          signal: controlador.signal,
        });

        if (!controlador.signal.aborted) {
          setMembresias(datos);
        }
      } catch (error) {
        if (controlador.signal.aborted) return;

        setError(
          error instanceof TypeError
            ? "No se pudo conectar con el servidor."
            : error instanceof Error
              ? error.message
              : "No se pudieron cargar tus negocios.",
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargarNegocios();
    return () => controlador.abort();
  }, [accessToken, intento]);

  if (agendaSeleccionada) {
    return (
      <AgendaNegocio
        key={agendaSeleccionada.barberia.id}
        barberiaId={agendaSeleccionada.barberia.id}
        nombreBarberia={agendaSeleccionada.barberia.nombre}
        administrador={agendaSeleccionada.rol === "ADMINISTRADOR"}
        profesionalId={agendaSeleccionada.profesionalId}
        onVolver={() => {
          setAgendaSeleccionada(null);
          setIntento((i) => i + 1);
        }}
      />
    );
  }

  if (serviciosSeleccionados) {
    return (
      <ServiciosNegocio
        key={serviciosSeleccionados.id}
        barberiaId={serviciosSeleccionados.id}
        nombreBarberia={serviciosSeleccionados.nombre}
        onVolver={() => setServiciosSeleccionados(null)}
      />
    );
  }

  if (equipoSeleccionado) {
    return (
      <MiEquipo
        key={equipoSeleccionado.id}
        barberiaId={equipoSeleccionado.id}
        nombreBarberia={equipoSeleccionado.nombre}
        onVolver={() => setEquipoSeleccionado(null)}
      />
    );
  }

  if (creando) {
    return (
      <CrearNegocio
        onVolver={() => {
          setCreando(false);
          setIntento((actual) => actual + 1);
        }}
        onCreado={(negocio) => {
          setCreando(false);
          setAviso(
            `La barbería ${negocio.nombre} fue creada. Ya eres su administrador.`,
          );
          setIntento((actual) => actual + 1);
        }}
      />
    );
  }

  if (barberiaSeleccionada !== null) {
    return (
      <EditarNegocio
        key={barberiaSeleccionada}
        barberiaId={barberiaSeleccionada}
        onVolver={() => {
          setBarberiaSeleccionada(null);
          setIntento((actual) => actual + 1);
        }}
      />
    );
  }

  return (
    <section aria-labelledby="titulo-negocios">
      <div className="negocios-cabecera">
        <div>
          <h2 id="titulo-negocios">Mis negocios</h2>
          <p>Aquí aparecen los negocios donde tienes una membresía activa.</p>
        </div>
        <div
          className="grupo-acciones"
          role="group"
          aria-label="Acciones de mis negocios"
        >
          <button
            type="button"
            className="boton-secundario"
            disabled={cargando}
            onClick={() => setIntento((actual) => actual + 1)}
          >
            {cargando ? "Cargando…" : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAviso("");
              setCreando(true);
            }}
          >
            Crear barbería
          </button>
        </div>
      </div>
      {aviso && (
        <p className="mensaje-exito" role="status">
          {aviso}
        </p>
      )}

      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Consultando tus negocios…" />
      ) : error ? (
        <EstadoContenido
          tipo="error"
          mensaje={error}
          onReintentar={() => setIntento((actual) => actual + 1)}
        />
      ) : membresias.length === 0 ? (
        <EstadoContenido
          tipo="vacio"
          mensaje="Todavía no perteneces a un negocio. Si eres dueño, crea tu barbería. Si trabajas en una, pide al administrador que te incorpore al equipo."
        />
      ) : (
        <ul className="negocios-lista">
          {membresias.map(({ barberia, rol, profesionalId }) => (
            <li key={barberia.id} className="negocio-tarjeta">
              <span className="negocio-rol">
                {rol === "ADMINISTRADOR"
                  ? "Administrador"
                  : "Miembro del equipo"}
              </span>
              <h3>{barberia.nombre}</h3>
              <p>{barberia.ciudad}</p>
              {rol === "ADMINISTRADOR" || profesionalId !== null ? (
                <div className="negocio-acciones">
                  <button
                    type="button"
                    className="negocio-editar"
                    onClick={() =>
                      setAgendaSeleccionada({ barberia, rol, profesionalId })
                    }
                  >
                    {rol === "ADMINISTRADOR" ? "Ver agenda" : "Mi agenda"}
                  </button>
                </div>
              ) : (
                <p>
                  Tu cuenta aún no tiene un profesional asignado. Contacta al
                  administrador para acceder a tu agenda.
                </p>
              )}
              {rol === "ADMINISTRADOR" && (
                <div
                  className="negocio-acciones"
                  role="group"
                  aria-label={`Administrar ${barberia.nombre}`}
                >
                  <button
                    type="button"
                    onClick={() => setEquipoSeleccionado(barberia)}
                  >
                    Mi equipo
                  </button>
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => setServiciosSeleccionados(barberia)}
                  >
                    Servicios
                  </button>
                  <button
                    type="button"
                    className="boton-secundario negocio-editar"
                    onClick={() => setBarberiaSeleccionada(barberia.id)}
                  >
                    Editar negocio
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
