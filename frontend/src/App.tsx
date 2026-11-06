import { useEffect, useState } from 'react';
import type { FormEvent } from "react";
import CatalogoBarberias from './components/CatalogoBarberias.js';
import MisReservas from './components/MisReservas.js';
import { api,ApiError, escucharSesionInvalida,} from './lib/api.js';
import MiPerfil from './components/MiPerfil.js';
import {
  normalizarNombre,
  validarNombre,
  validarTelefono,
} from './lib/validaciones.js';
import AvisoPerfilIncompleto from './components/AvisoPerfilIncompleto.js';
type Sesion = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
  };
};

type UsuarioRegistrado = {
  id: number;
  nombre: string;
  email: string;
  creadoEn: string;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [aviso, setAviso] = useState("");
  const [vista, setVista] = useState<
  'catalogo' | 'reservas' | 'perfil'
>('catalogo');
const [apellidoPaterno, setApellidoPaterno] = useState('');
const [apellidoMaterno, setApellidoMaterno] = useState('');
const [telefono, setTelefono] = useState('');
const tokenActual = sesion?.accessToken;

useEffect(() => {
  if (!tokenActual) return;

  return escucharSesionInvalida((tokenRechazado) => {
    if (tokenRechazado !== tokenActual) return;

    setSesion(null);
    setPassword('');
    setNombre('');
    setModo('login');
    setVista('catalogo');
    setError('');
    setAviso(
      'Tu sesión venció o dejó de ser válida. Inicia sesión nuevamente.',
    );
  });
}, [tokenActual]);


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

    setSesion(datos);
    setPassword('');
    setVista('catalogo');
  } catch (error) {
    if (error instanceof ApiError) {
      setError(error.message);
    } else {
      setError(
        'No se pudo completar el inicio de sesión. Comprueba la conexión e inténtalo nuevamente.',
      );
    }
  } finally {
    setCargando(false);
  }
}
async function registrarCuenta(
  evento: FormEvent<HTMLFormElement>,
) {
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
    if (error instanceof ApiError && error.status < 500) {
      setError(error.message);
    } else {
      setError(
        'No pudimos confirmar si la cuenta se creó. Prueba iniciar sesión con ese correo y contraseña antes de registrarte nuevamente.',
      );
    }
  } finally {
    setCargando(false);
  }
}

  function cambiarModo() {
    setModo((actual) => (actual === "login" ? "registro" : "login"));
    setPassword("");
    setError("");
    setAviso("");
  }
  function cerrarSesion() {
    setSesion(null);
    setPassword("");
    setError("");
    setVista('catalogo');
  }
return (
 <main className={sesion ? 'aplicacion' : 'contenedor'}>
  <section className={sesion ? 'panel-cliente' : 'tarjeta'}>
      {!sesion && <p className="etiqueta">BARBER SAAS</p>}

      {sesion ? (
        <>
         <header className="cabecera-cliente">
  <div className="marca">
    <span className="marca-icono" aria-hidden="true">
      B
    </span>
    <span>BARBER SAAS</span>
  </div>

  <div className="cuenta-cliente">
    <span className="saludo-cliente">
      Hola, {sesion.usuario.nombre}
    </span>

    <button
      type="button"
      className="boton-secundario"
      onClick={cerrarSesion}
    >
      Cerrar sesión
    </button>
  </div>
</header>

<nav className="menu-cliente" aria-label="Opciones del cliente">
  <button
    type="button"
    className="boton-secundario"
    aria-pressed={vista === 'catalogo'}
    onClick={() => setVista('catalogo')}
  >
    Reservar
  </button>

  <button
    type="button"
    className="boton-secundario"
    aria-pressed={vista === 'reservas'}
    onClick={() => setVista('reservas')}
  >
    Mis reservas
  </button>
        <button
  type="button"
  className="boton-secundario"
  aria-pressed={vista === 'perfil'}
  onClick={() => setVista('perfil')}
>
  Mi perfil
</button>

</nav>

<div className="contenido-cliente">
  <div className="introduccion-cliente">
  <p className="etiqueta">
    {vista === 'catalogo'
      ? 'TU PRÓXIMA CITA'
      : vista === 'reservas'
        ? 'TU AGENDA'
        : 'TU CUENTA'}
  </p>

  <h1>
    {vista === 'catalogo'
      ? 'Un momento para ti'
      : vista === 'reservas'
        ? 'Tus citas, en un solo lugar'
        : 'Tus datos personales'}
  </h1>

  <p>
    {vista === 'catalogo'
      ? 'Elige tu barbería, encuentra tu servicio y reserva una hora.'
      : vista === 'reservas'
        ? 'Consulta tus reservas y organiza tu próxima visita.'
        : 'Mantén tu información de contacto actualizada.'}
  </p>
</div>
{vista !== 'perfil' && (
  <AvisoPerfilIncompleto
    accessToken={sesion.accessToken}
    onCompletar={() => setVista('perfil')}
  />
)}
  <div className="superficie-cliente">
{vista === 'catalogo' ? (
  <CatalogoBarberias accessToken={sesion.accessToken} />
) : vista === 'reservas' ? (
  <MisReservas accessToken={sesion.accessToken} />
) : (
  <MiPerfil
    accessToken={sesion.accessToken}
    onNombreActualizado={(nombre) => {
      setSesion((actual) =>
        actual
          ? {
              ...actual,
              usuario: {
                ...actual.usuario,
                nombre,
              },
            }
          : actual,
      );
    }}
  />
)}
  </div>
</div>
        </>
      ) : (
        <>
          <h1>
            {modo === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h1>

          <p>
            {modo === 'login'
              ? 'Ingresa a tu cuenta para reservar tu próxima cita.'
              : 'Regístrate para elegir tu barbería y reservar una hora.'}
          </p>

          {aviso && (
            <p className="mensaje-exito" role="status">
              {aviso}
            </p>
          )}

          <form
            className="formulario"
            onSubmit={
              modo === 'login' ? iniciarSesion : registrarCuenta
            }
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
      <label htmlFor="apellido-paterno">
        Apellido paterno
      </label>
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
                  modo === 'login'
                    ? 'current-password'
                    : 'new-password'
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
      )}
    </section>
  </main>
);
}

export default App;
