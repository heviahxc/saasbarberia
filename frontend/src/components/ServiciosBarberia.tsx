import { useEffect, useState } from 'react';
import ProfesionalesServicio from './ProfesionalesServicio.js';
import { api, ApiError } from '../lib/api.js';
import { formatearPrecio } from '../lib/formatos.js';
import PasosReserva from './PasosReserva.js';
import EstadoContenido from './EstadoContenido.js';
type Servicio = {
  id: number;
  nombre: string;
  duracionMinutos: number;
  precio: string;
};

type Props = {
  accessToken: string;
  barberiaId: number;
  nombreBarberia: string;
  onVolver: () => void;
};

export default function ServiciosBarberia({
  accessToken,
  barberiaId,
  nombreBarberia,
  onVolver,
}: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(
    null,
  );

  useEffect(() => {
  const controlador = new AbortController();

  async function cargarServicios() {
    setCargando(true);
    setError('');

    try {
      const datos = await api<Servicio[]>(
        `/catalogo/barberias/${barberiaId}/servicios`,
        {
          token: accessToken,
          signal: controlador.signal,
        },
      );

      if (!controlador.signal.aborted) {
        setServicios(datos);
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
              : 'No se pudieron cargar los servicios.',
        );
      }
    } finally {
      if (!controlador.signal.aborted) {
        setCargando(false);
      }
    }
  }

  void cargarServicios();

  return () => controlador.abort();
}, [accessToken, barberiaId, intento]);

  if (servicioSeleccionado) {
  return (
    <ProfesionalesServicio
      key={servicioSeleccionado.id}
      accessToken={accessToken}
      barberiaId={barberiaId}
      servicioId={servicioSeleccionado.id}
      nombreBarberia={nombreBarberia}
      nombreServicio={servicioSeleccionado.nombre}
      duracionMinutos={servicioSeleccionado.duracionMinutos}
precio={servicioSeleccionado.precio}
      onVolver={() => setServicioSeleccionado(null)}
    />
  );
}

  return (
    <section aria-labelledby="titulo-servicios">
        <PasosReserva pasoActual={2} />
      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
      >
        Volver a las barberías
      </button>

      <h2 id="titulo-servicios">{nombreBarberia}</h2>
      <p>Servicios disponibles</p>

      {cargando ? (
  <EstadoContenido
    tipo="cargando"
    mensaje="Cargando servicios…"
  />
) : error ? (
  <EstadoContenido
    tipo="error"
    mensaje={error}
    onReintentar={() => setIntento((actual) => actual + 1)}
  />
) : servicios.length === 0 ? (
  <EstadoContenido
    tipo="vacio"
    mensaje="Esta barbería todavía no tiene servicios disponibles."
  />
) : (
        <ul className="lista-barberias">
          {servicios.map((servicio) => (
            <li key={servicio.id} className="barberia">
              <h3>{servicio.nombre}</h3>
              <p>Duración: {servicio.duracionMinutos} minutos</p>
             <p>Precio: {formatearPrecio(servicio.precio)}</p>
              <button
  type="button"
  className="accion-tarjeta"
  onClick={() => setServicioSeleccionado(servicio)}
>
  Elegir profesional
</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}