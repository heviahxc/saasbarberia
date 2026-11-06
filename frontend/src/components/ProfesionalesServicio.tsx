import { useEffect, useState } from 'react';
import DisponibilidadServicio from './DisponibilidadServicio.js';
import { api, ApiError } from '../lib/api.js';
import PasosReserva from './PasosReserva.js';
type Profesional = {
  id: number;
  nombre: string;
};

type Props = {
  accessToken: string;
  barberiaId: number;
  servicioId: number;
  nombreBarberia: string;
  nombreServicio: string;
  duracionMinutos: number;
precio: string;
  onVolver: () => void;
};

export default function ProfesionalesServicio({
   accessToken,
  barberiaId,
  servicioId,
  nombreBarberia,
  nombreServicio,
  duracionMinutos,
  precio,
  onVolver,
}: Props) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  const [seleccionado, setSeleccionado] = useState<Profesional | null>(
    null,
  );

useEffect(() => {
  const controlador = new AbortController();

  async function cargarProfesionales() {
    setCargando(true);
    setError('');

    try {
      const datos = await api<Profesional[]>(
        `/catalogo/barberias/${barberiaId}/servicios/${servicioId}/profesionales`,
        {
          token: accessToken,
          signal: controlador.signal,
        },
      );

      if (!controlador.signal.aborted) {
        setProfesionales(datos);
      }
    } catch (error) {
      if (controlador.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        setError(
          'Tu sesión no es válida o ha vencido. Cierra sesión e ingresa nuevamente.',
        );
      } else {
        setError(
          error instanceof TypeError
            ? 'No se pudo conectar con el servidor.'
            : error instanceof Error
              ? error.message
              : 'No se pudieron cargar los profesionales.',
        );
      }
    } finally {
      if (!controlador.signal.aborted) {
        setCargando(false);
      }
    }
  }

  void cargarProfesionales();

  return () => controlador.abort();
}, [accessToken, barberiaId, servicioId, intento]);

  if (seleccionado) {
  return (
    <DisponibilidadServicio
      key={seleccionado.id}
      accessToken={accessToken}
      barberiaId={barberiaId}
      servicioId={servicioId}
      profesionalId={seleccionado.id}
      nombreBarberia={nombreBarberia}
      nombreServicio={nombreServicio}
      nombreProfesional={seleccionado.nombre}
      duracionMinutos={duracionMinutos}
precio={precio}
      onVolver={() => setSeleccionado(null)}
    />
  );
}

  return (
    <section aria-labelledby="titulo-profesionales">
        <PasosReserva pasoActual={3} />
      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
      >
        Volver a los servicios
      </button>

      <h2 id="titulo-profesionales">Elige un profesional</h2>
      <p>
        {nombreBarberia} · {nombreServicio}
      </p>

      {cargando ? (
        <p role="status">Cargando profesionales…</p>
      ) : error ? (
        <div>
          <p className="mensaje-error" role="alert">
            {error}
          </p>

          <button
            type="button"
            className="boton-secundario"
            onClick={() => setIntento((actual) => actual + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : profesionales.length === 0 ? (
        <p>No hay profesionales disponibles para este servicio.</p>
      ) : (
        <>
          <ul className="lista-barberias">
            {profesionales.map((profesional) => (
              <li key={profesional.id} className="barberia">
                <h3>{profesional.nombre}</h3>

                <button
                  type="button"
                  className="accion-tarjeta"
                  aria-pressed={false}
                  onClick={() => setSeleccionado(profesional)}
                >
                  Elegir profesional
                </button>
              </li>
            ))}
          </ul>

        
        </>
      )}
    </section>
  );
}