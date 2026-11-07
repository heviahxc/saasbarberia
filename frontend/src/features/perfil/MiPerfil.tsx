import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from '../auth/auth-context.js';
import { api } from "../../shared/lib/api.js";
import EstadoContenido from "../../shared/components/EstadoContenido.js";

import {
  normalizarNombre,
  validarNombre,
  validarTelefono,
} from "../../shared/lib/validaciones.js";

type Perfil = {
  id: number;
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  telefono: string | null;
  email: string;
};



type ErroresCampos = Partial<
  Record<"nombre" | "apellidoPaterno" | "apellidoMaterno" | "telefono", string>
>;

export default function MiPerfil() {
  const { sesion, actualizarNombre } = useAuth();
  const accessToken = sesion?.accessToken;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorGuardado, setErrorGuardado] = useState("");
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);
  const [erroresCampos, setErroresCampos] = useState<ErroresCampos>({});

  useEffect(() => {
     if (!accessToken) return;
    const controlador = new AbortController();

    async function cargarPerfil() {
      setCargando(true);
      setErrorCarga("");

      try {
        const datos = await api<Perfil>("/auth/me", {
          token: accessToken,
          signal: controlador.signal,
        });

        if (!controlador.signal.aborted) {
          setPerfil(datos);
        }
      } catch (error) {
        if (controlador.signal.aborted) return;

        setErrorCarga(
          error instanceof TypeError
            ? "No se pudo conectar con el servidor."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar tu perfil.",
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargarPerfil();

    return () => controlador.abort();
  }, [accessToken, intento]);

  function cambiarCampo(
    campo: "nombre" | "apellidoPaterno" | "apellidoMaterno" | "telefono",
    valor: string,
  ) {
    setPerfil((actual) => (actual ? { ...actual, [campo]: valor } : actual));
    setAviso("");
    setErrorGuardado("");
    setErroresCampos((actuales) => {
      const siguientes = { ...actuales };
      delete siguientes[campo];
      return siguientes;
    });
  }

  async function guardarPerfil(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!perfil || !accessToken || guardando) return;
    const comprobaciones = {
      nombre: validarNombre(perfil.nombre, "El nombre"),
      apellidoPaterno: validarNombre(
        perfil.apellidoPaterno ?? "",
        "El apellido paterno",
      ),
      apellidoMaterno: validarNombre(
        perfil.apellidoMaterno ?? "",
        "El apellido materno",
        true,
      ),
      telefono: validarTelefono(perfil.telefono ?? ""),
    };

    const errores: ErroresCampos = {};

    for (const campo of Object.keys(comprobaciones) as Array<
      keyof typeof comprobaciones
    >) {
      const mensaje = comprobaciones[campo];

      if (mensaje) {
        errores[campo] = mensaje;
      }
    }

    setErroresCampos(errores);
    setAviso("");
    setErrorGuardado("");

    if (Object.keys(errores).length > 0) {
      return;
    }

    setGuardando(true);
    setErrorGuardado("");
    setAviso("");

    try {
      const actualizado = await api<Perfil>("/auth/me", {
        method: "PATCH",
        token: accessToken,
        body: {
          nombre: normalizarNombre(perfil.nombre),
          apellidoPaterno: normalizarNombre(perfil.apellidoPaterno ?? ""),
          apellidoMaterno: normalizarNombre(perfil.apellidoMaterno ?? ""),
          telefono: (perfil.telefono ?? "").trim(),
        },
      });

      setPerfil(actualizado);
      actualizarNombre(actualizado.nombre);
      setAviso("Tu perfil fue actualizado.");
    } catch (error) {
      setErrorGuardado(
        error instanceof TypeError
          ? "Se perdió la conexión. Vuelve a entrar en Mi perfil para comprobar si los cambios se guardaron."
          : error instanceof Error
            ? error.message
            : "No se pudo guardar tu perfil.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-perfil">
      <h2 id="titulo-perfil">Mi perfil</h2>

      {cargando ? (
        <EstadoContenido tipo="cargando" mensaje="Cargando tu perfil…" />
      ) : errorCarga ? (
        <EstadoContenido
          tipo="error"
          mensaje={errorCarga}
          onReintentar={() => setIntento((actual) => actual + 1)}
        />
      ) : perfil ? (
        <>
          <p>
            Correo de tu cuenta: <strong>{perfil.email}</strong>
          </p>

          <form
            className="formulario"
            onSubmit={guardarPerfil}
            aria-busy={guardando}
            noValidate
          >
            <div className="campo">
              <label htmlFor="perfil-nombre">Nombre</label>
              <input
                id="perfil-nombre"
                type="text"
                autoComplete="given-name"
                required
                maxLength={100}
                pattern={String.raw`.*\S.*`}
                value={perfil.nombre}
                disabled={guardando}
                aria-invalid={Boolean(erroresCampos.nombre)}
aria-describedby={
  erroresCampos.nombre ? 'error-perfil-nombre' : undefined
}
                onChange={(evento) =>
                  cambiarCampo("nombre", evento.target.value)
                }
              />
              {erroresCampos.nombre && (
  <small id="error-perfil-nombre" className="error-campo" role="alert">
    {erroresCampos.nombre}
  </small>
)}
            </div>

            <div className="campo">
              <label htmlFor="perfil-paterno">Apellido paterno</label>
              <input
                id="perfil-paterno"
                type="text"
                required
                maxLength={100}
                pattern={String.raw`.*\S.*`}
                value={perfil.apellidoPaterno ?? ""}
                disabled={guardando}
                aria-invalid={Boolean(erroresCampos.apellidoPaterno)}
aria-describedby={
  erroresCampos.apellidoPaterno ? 'error-perfil-paterno' : undefined
}
                onChange={(evento) =>
                  cambiarCampo("apellidoPaterno", evento.target.value)
                }
              />
              {erroresCampos.apellidoPaterno && (
  <small id="error-perfil-paterno" className="error-campo" role="alert">
    {erroresCampos.apellidoPaterno}
  </small>
)}
            </div>

            <div className="campo">
              <label htmlFor="perfil-materno">
                Apellido materno (opcional)
              </label>
              <input
                id="perfil-materno"
                type="text"
                maxLength={100}
                value={perfil.apellidoMaterno ?? ""}
                disabled={guardando}
                aria-invalid={Boolean(erroresCampos.apellidoMaterno)}
aria-describedby={
  erroresCampos.apellidoMaterno ? 'error-perfil-materno' : undefined
}
                onChange={(evento) =>
                  cambiarCampo("apellidoMaterno", evento.target.value)
                }
              />
              {erroresCampos.apellidoMaterno && (
  <small id="error-perfil-materno" className="error-campo" role="alert">
    {erroresCampos.apellidoMaterno}
  </small>
)}
            </div>

            <div className="campo">
              <label htmlFor="perfil-telefono">Teléfono</label>
              <input
                id="perfil-telefono"
                type="tel"
                autoComplete="tel"
                required
                maxLength={16}
                pattern={String.raw`\+[1-9][0-9]{7,14}`}
                title="Incluye el prefijo internacional, sin espacios."
                placeholder="+56912345678"
                aria-invalid={Boolean(erroresCampos.telefono)}
aria-describedby={
  erroresCampos.telefono
    ? 'ayuda-telefono error-perfil-telefono'
    : 'ayuda-telefono'
}
                value={perfil.telefono ?? ""}
                disabled={guardando}
                onChange={(evento) =>
                  cambiarCampo("telefono", evento.target.value)
                }
              />

              <small id="ayuda-telefono">
                Incluye el prefijo internacional, sin espacios. Ejemplo:
                +56912345678.
              </small>

              {erroresCampos.telefono && (
  <small id="error-perfil-telefono" className="error-campo" role="alert">
    {erroresCampos.telefono}
  </small>
)}
            </div>

            {errorGuardado && (
              <EstadoContenido tipo="error" mensaje={errorGuardado} />
            )}

            {aviso && (
              <p className="mensaje-exito" role="status">
                {aviso}
              </p>
            )}

            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </>
      ) : null}
    </section>
  );
}
