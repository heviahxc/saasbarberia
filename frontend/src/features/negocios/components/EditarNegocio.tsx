import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '../../auth/auth-context.js';
import { api } from '../../../shared/lib/api.js';
import EstadoContenido from '../../../shared/components/EstadoContenido.js';

import type { Negocio } from '../types.js';
import CamposNegocio from './CamposNegocio.js';

type Props = {
  barberiaId: number;
  onVolver: () => void;
};

export default function EditarNegocio({
  barberiaId,
  onVolver,
}: Props) {
  const { sesion } = useAuth();
  const accessToken = sesion?.accessToken;

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorGuardado, setErrorGuardado] = useState('');
  const [aviso, setAviso] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarNegocio() {
      if (!accessToken) return;

      setCargando(true);
      setErrorCarga('');

      try {
        const datos = await api<Negocio>(
          `/barberias/${barberiaId}`,
          {
            token: accessToken,
            signal: controlador.signal,
          },
        );

        if (!controlador.signal.aborted) {
          setNegocio(datos);
        }
      } catch (error) {
        if (controlador.signal.aborted) return;

        setErrorCarga(
          error instanceof TypeError
            ? 'No se pudo conectar con el servidor.'
            : error instanceof Error
              ? error.message
              : 'No se pudo cargar el negocio.',
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargarNegocio();

    return () => controlador.abort();
  }, [accessToken, barberiaId, intento]);

  function cambiarCampo(
    campo: 'nombre' | 'ciudad' | 'direccion',
    valor: string,
  ) {
    setNegocio((actual) =>
      actual ? { ...actual, [campo]: valor } : actual,
    );
    setAviso('');
    setErrorGuardado('');
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!negocio || !accessToken || guardando) return;

    const cuerpo = {
      nombre: negocio.nombre.trim(),
      ciudad: negocio.ciudad.trim(),
      direccion: (negocio.direccion ?? '').trim(),
      intervaloReservasMinutos: negocio.intervaloReservasMinutos,
    };

    setAviso('');
    setErrorGuardado('');

    if (!cuerpo.nombre || !cuerpo.ciudad || !cuerpo.direccion) {
      setErrorGuardado(
        'Completa el nombre, la ciudad y la dirección.',
      );
      return;
    }

    setGuardando(true);

    try {
      const actualizado = await api<Negocio>(
        `/barberias/${barberiaId}`,
        {
          method: 'PATCH',
          token: accessToken,
          body: cuerpo,
        },
      );

      setNegocio(actualizado);
      setAviso('Los datos del negocio fueron actualizados.');
    } catch (error) {
      setErrorGuardado(
        error instanceof TypeError
          ? 'Se perdió la conexión. Vuelve a abrir el negocio para comprobar si los cambios se guardaron.'
          : error instanceof Error
            ? error.message
            : 'No se pudo guardar el negocio.',
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-editar-negocio">
      <button
        type="button"
        className="boton-secundario volver"
        onClick={onVolver}
        disabled={guardando}
      >
        Volver a mis negocios
      </button>

      <h2 id="titulo-editar-negocio">Datos del negocio</h2>

      {cargando ? (
        <EstadoContenido
          tipo="cargando"
          mensaje="Cargando los datos del negocio…"
        />
      ) : errorCarga ? (
        <EstadoContenido
          tipo="error"
          mensaje={errorCarga}
          onReintentar={() => setIntento((actual) => actual + 1)}
        />
      ) : negocio ? (
        <form
          className="formulario"
          onSubmit={guardar}
          aria-busy={guardando}
        >
          <CamposNegocio datos={{ ...negocio, direccion: negocio.direccion ?? '' }} disabled={guardando} onCambiar={cambiarCampo} />

          <div className="campo">
            <label htmlFor="negocio-intervalo">Ofrecer horas de inicio cada</label>
            <select id="negocio-intervalo" value={negocio.intervaloReservasMinutos} disabled={guardando}
              aria-describedby="ayuda-intervalo" onChange={evento => {
                const valor = Number(evento.target.value) as 15 | 30;
                setNegocio(actual => actual ? { ...actual, intervaloReservasMinutos: valor } : actual);
                setAviso(''); setErrorGuardado('');
              }}>
              <option value={15}>15 minutos · 09:00, 09:15, 09:30…</option>
              <option value={30}>30 minutos · 09:00, 09:30, 10:00…</option>
            </select>
            <small id="ayuda-intervalo">Se aplica a nuevas reservas y al elegir una nueva hora al reagendar. No cambia la duración de los servicios ni las citas existentes.</small>
          </div>
          <p>Zona horaria: {negocio.zonaHoraria}</p>

          {errorGuardado && (
            <EstadoContenido
              tipo="error"
              mensaje={errorGuardado}
            />
          )}

          {aviso && (
            <p className="mensaje-exito" role="status">
              {aviso}
            </p>
          )}

          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      ) : null}
    </section>
  );
}