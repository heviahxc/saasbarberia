import { useState } from 'react';
import type { FormEvent } from 'react';

import { api, ApiError } from '../../../shared/lib/api.js';
import {
  normalizarNombre,
  validarNombre,
  validarTelefono,
} from '../../../shared/lib/validaciones.js';
import type { Sesion, UsuarioRegistrado } from '../types.js';

type Props = {
  avisoInicial?: string;
  area?: "cliente" | "negocio";
  onSesionIniciada: (sesion: Sesion) => void;
};

export default function AccesoCuenta({
  avisoInicial = '',
  area = 'cliente',
  onSesionIniciada,
}: Props) {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(avisoInicial);

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (cargando) return;

    setCargando(true);
    setError('');
    setAviso('');

    try {
      const datos = await api<Sesion>('/auth/login', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      setPassword('');
      onSesionIniciada(datos);
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo completar el inicio de sesión. Comprueba la conexión e inténtalo nuevamente.',
      );
    } finally {
      setCargando(false);
    }
  }

  async function registrarCuenta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (cargando) return;

    setError('');
    setAviso('');

    const errores = [
      validarNombre(nombre, 'El nombre'),
      validarNombre(apellidoPaterno, 'El apellido paterno'),
      validarNombre(apellidoMaterno, 'El apellido materno', true),
      validarTelefono(telefono),
    ].filter((mensaje): mensaje is string => Boolean(mensaje));

    if (errores.length > 0) {
      setError(errores.join(' '));
      return;
    }

    setCargando(true);

    try {
      await api<UsuarioRegistrado>('/auth/registro', {
        method: 'POST',
        body: {
          nombre: normalizarNombre(nombre),
          apellidoPaterno: normalizarNombre(apellidoPaterno),
          apellidoMaterno: normalizarNombre(apellidoMaterno),
          telefono: telefono.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      setModo('login');
      setNombre('');
      setApellidoPaterno('');
      setApellidoMaterno('');
      setTelefono('');
      setPassword('');
      setAviso('Tu cuenta fue creada. Ahora puedes iniciar sesión.');
    } catch (error) {
      setError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'No pudimos confirmar si la cuenta se creó. Prueba iniciar sesión con ese correo y contraseña antes de registrarte nuevamente.',
      );
    } finally {
      setCargando(false);
    }
  }

  function cambiarModo() {
    setModo((actual) => (actual === 'login' ? 'registro' : 'login'));
    setPassword('');
    setError('');
    setAviso('');
  }

  return (
    <>
      <h1>{modo === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>

      <p>
        {modo === 'login'
          ? area === 'negocio'
            ? 'Ingresa con tu cuenta para acceder a los negocios de tu equipo.'
            : 'Ingresa a tu cuenta para reservar tu próxima cita.'
          : area === 'negocio'
            ? 'Crea tu cuenta personal. El acceso a un negocio requiere una membresía activa.'
            : 'Regístrate para elegir tu barbería y reservar una hora.'}
      </p>

      {aviso && (
        <p className="mensaje-exito" role="status">
          {aviso}
        </p>
      )}

      <form
        className="formulario"
        onSubmit={modo === 'login' ? iniciarSesion : registrarCuenta}
        aria-busy={cargando}
      >
        {modo === 'registro' && (
          <>
            <div className="campo">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                autoComplete="given-name"
                required
                maxLength={100}
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
                disabled={cargando}
              />
            </div>

            <div className="campo">
              <label htmlFor="apellido-paterno">Apellido paterno</label>
              <input
                id="apellido-paterno"
                name="apellidoPaterno"
                type="text"
                required
                maxLength={100}
                value={apellidoPaterno}
                onChange={(evento) =>
                  setApellidoPaterno(evento.target.value)
                }
                disabled={cargando}
              />
            </div>

            <div className="campo">
              <label htmlFor="apellido-materno">
                Apellido materno (opcional)
              </label>
              <input
                id="apellido-materno"
                name="apellidoMaterno"
                type="text"
                maxLength={100}
                value={apellidoMaterno}
                onChange={(evento) =>
                  setApellidoMaterno(evento.target.value)
                }
                disabled={cargando}
              />
            </div>

            <div className="campo">
              <label htmlFor="telefono-registro">Teléfono</label>
              <input
                id="telefono-registro"
                name="telefono"
                type="tel"
                autoComplete="tel"
                required
                maxLength={16}
                placeholder="+56912345678"
                aria-describedby="ayuda-telefono-registro"
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                disabled={cargando}
              />

              <small id="ayuda-telefono-registro">
                Incluye el prefijo internacional, sin espacios.
                Ejemplo: +56912345678.
              </small>
            </div>
          </>
        )}

        <div className="campo">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            disabled={cargando}
          />
        </div>

        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              modo === 'login' ? 'current-password' : 'new-password'
            }
            required
            minLength={modo === 'registro' ? 8 : 1}
            maxLength={128}
            aria-describedby={
              modo === 'registro' ? 'ayuda-password' : undefined
            }
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            disabled={cargando}
          />

          {modo === 'registro' && (
            <small id="ayuda-password">
              Utiliza entre 8 y 128 caracteres.
            </small>
          )}
        </div>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={cargando}>
          {cargando
            ? 'Procesando…'
            : modo === 'login'
              ? 'Iniciar sesión'
              : 'Crear cuenta'}
        </button>

        <button
          type="button"
          className="boton-secundario"
          onClick={cambiarModo}
          disabled={cargando}
        >
          {modo === 'login'
            ? 'No tengo cuenta: registrarme'
            : 'Ya tengo cuenta: iniciar sesión'}
        </button>
      </form>
    </>
  );
}