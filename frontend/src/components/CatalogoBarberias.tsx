import { useEffect, useState } from "react";
import ServiciosBarberia from "./ServiciosBarberia.js";
import { api, ApiError } from '../lib/api.js';
import PasosReserva from './PasosReserva.js';
import EstadoContenido from './EstadoContenido.js';
type Barberia = {
  id: number;
  nombre: string;
  ciudad: string;
};

type Props = {
  accessToken: string;
};

export default function CatalogoBarberias({ accessToken }: Props) {
  const [barberias, setBarberias] = useState<Barberia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [barberiaSeleccionada, setBarberiaSeleccionada] =
    useState<Barberia | null>(null);
useEffect(() => {
  const controlador = new AbortController();

  async function cargarBarberias() {
    setCargando(true);
    setError('');

    try {
      const datos = await api<Barberia[]>('/catalogo/barberias', {
        token: accessToken,
        signal: controlador.signal,
      });

      if (!controlador.signal.aborted) {
        setBarberias(datos);
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
              : 'No se pudieron cargar las barberías.',
        );
      }
    } finally {
      if (!controlador.signal.aborted) {
        setCargando(false);
      }
    }
  }

  void cargarBarberias();

  return () => controlador.abort();
}, [accessToken, intento]);
  if (barberiaSeleccionada) {
    return (
      <ServiciosBarberia
        key={barberiaSeleccionada.id}
        accessToken={accessToken}
        barberiaId={barberiaSeleccionada.id}
        nombreBarberia={barberiaSeleccionada.nombre}
        onVolver={() => setBarberiaSeleccionada(null)}
      />
    );
  }


  return (
  <section aria-labelledby="titulo-barberias">
    <PasosReserva pasoActual={1} />

    <h2 id="titulo-barberias">Barberías disponibles</h2>

    {cargando ? (
      <EstadoContenido
        tipo="cargando"
        mensaje="Cargando barberías…"
      />
    ) : error ? (
      <EstadoContenido
        tipo="error"
        mensaje={error}
        onReintentar={() => setIntento((actual) => actual + 1)}
      />
    ) : barberias.length === 0 ? (
      <EstadoContenido
        tipo="vacio"
        mensaje="Todavía no hay barberías disponibles."
      />
    ) : (
      <ul className="lista-barberias cuadricula-barberias">
        {barberias.map((barberia) => (
          <li key={barberia.id} className="barberia">
            <h3>{barberia.nombre}</h3>
            <p>{barberia.ciudad}</p>

            <button
              type="button"
              className="accion-tarjeta"
              onClick={() => setBarberiaSeleccionada(barberia)}
            >
              Ver servicios
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
}
