import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../auth/auth-context.js';
import { api, ApiError } from '../../../shared/lib/api.js';
import EstadoContenido from '../../../shared/components/EstadoContenido.js';
import CamposNegocio from './CamposNegocio.js';
import type { DatosNegocio, Negocio } from '../types.js';

type Props = { onVolver: () => void; onCreado: (negocio: Negocio) => void };

export default function CrearNegocio({ onVolver, onCreado }: Props) {
  const { sesion } = useAuth();
  const [datos, setDatos] = useState<DatosNegocio>({ nombre: '', ciudad: '', direccion: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [incierto, setIncierto] = useState(false);
  const enviando = useRef(false);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!sesion || enviando.current || incierto) return;
    const body = { nombre: datos.nombre.trim(), ciudad: datos.ciudad.trim(), direccion: datos.direccion.trim() };
    if (body.nombre.length < 3 || body.ciudad.length < 2 || !body.direccion) {
      setError('Completa el nombre (mínimo 3 caracteres), la ciudad (mínimo 2) y la dirección.');
      return;
    }
    enviando.current = true;
    setGuardando(true);
    setError('');
    try {
      const negocio = await api<Negocio>('/barberias', { method: 'POST', token: sesion.accessToken, body });
      onCreado(negocio);
    } catch (fallo) {
      if (!(fallo instanceof ApiError) || fallo.status >= 500) {
        setIncierto(true);
        setError('No pudimos confirmar el resultado. Vuelve a mis negocios y actualiza la lista antes de intentar crear otra barbería.');
      } else {
        setError(fallo.message);
      }
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-crear-negocio">
      <button type="button" className="boton-secundario volver" disabled={guardando} onClick={onVolver}>Volver a mis negocios</button>
      <h2 id="titulo-crear-negocio">Crea tu barbería</h2>
      <p>Tu cuenta quedará como administradora de este negocio. Podrás seguir reservando como cliente con la misma cuenta.</p>
      <form className="formulario" onSubmit={crear} aria-busy={guardando}>
        <CamposNegocio datos={datos} disabled={guardando || incierto} onCambiar={(campo, valor) => {
          setDatos(actual => ({ ...actual, [campo]: valor })); setError('');
        }} />
        <p>Zona horaria: America/Santiago. Luego podrás completar los servicios, profesionales y horarios.</p>
        {error && <EstadoContenido tipo="error" mensaje={error} />}
        <button type="submit" disabled={guardando || incierto}>{guardando ? 'Creando…' : 'Crear barbería'}</button>
      </form>
    </section>
  );
}
