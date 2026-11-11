import { useEffect, useState } from "react";
import AceptarInvitacion from "./features/equipo/components/AceptarInvitacion.js";
import AccesoCuenta from "./features/auth/components/AccesoCuenta.js";
import { useAuth } from "./features/auth/auth-context.js";
import CatalogoBarberias from "./features/reservas/components/CatalogoBarberias.js";
import MisReservas from "./features/reservas/components/MisReservas.js";
import MisNegocios from "./features/negocios/components/MisNegocios.js";
import MiPerfil from "./features/perfil/MiPerfil.js";
import AvisoPerfilIncompleto from "./features/perfil/AvisoPerfilIncompleto.js";
import LayoutCliente from "./shared/layouts/LayoutCliente.js";
import "./app/entrada.css";

type Area = "cliente" | "negocio";
type Vista = "catalogo" | "reservas" | "perfil" | "negocios";
const textos = {
  catalogo: {
    etiqueta: "TU PRÓXIMA CITA",
    titulo: "Un momento para ti",
    descripcion: "Elige tu barbería, encuentra tu servicio y reserva una hora.",
  },
  reservas: {
    etiqueta: "TU AGENDA",
    titulo: "Tus citas, en un solo lugar",
    descripcion: "Consulta tus reservas y organiza tu próxima visita.",
  },
  perfil: {
    etiqueta: "TU CUENTA",
    titulo: "Tus datos personales",
    descripcion:
      "Tu perfil es el mismo en el espacio de clientes y de negocios.",
  },
  negocios: {
    etiqueta: "TU ESPACIO DE TRABAJO",
    titulo: "Tus negocios y tu equipo",
    descripcion:
      "Accede a los negocios a los que perteneces, según tu rol en cada uno.",
  },
};

export default function App() {
  const { sesion, avisoAcceso, iniciarSesion, cerrarSesion } = useAuth();
  const [area, setArea] = useState<Area | null>(null);
  const [vista, setVista] = useState<Vista>("catalogo");
  const [invitacion, setInvitacion] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("invitacion"),
  );
  useEffect(() => {
    const actualizar = () =>
      setInvitacion(
        new URLSearchParams(window.location.hash.slice(1)).get("invitacion"),
      );
    window.addEventListener("hashchange", actualizar);
    return () => window.removeEventListener("hashchange", actualizar);
  }, []);

  function elegirArea(nuevaArea: Area) {
    setArea(nuevaArea);
    setVista(nuevaArea === "cliente" ? "catalogo" : "negocios");
  }

  if (invitacion !== null) {
    return (
      <AceptarInvitacion
        invitacion={invitacion}
        onSalir={() => {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
          setInvitacion(null);
          elegirArea("negocio");
        }}
      />
    );
  }

  if (area === null) {
    return (
      <main className="entrada">
        <header className="entrada-cabecera">
          <span className="marca">BARBER SAAS</span>
          <nav aria-label="Elige tu espacio">
            <button
              className="boton-secundario"
              onClick={() => elegirArea("cliente")}
            >
              Clientes
            </button>
            <button
              className="boton-secundario"
              onClick={() => elegirArea("negocio")}
            >
              Negocios
            </button>
          </nav>
        </header>
        <section className="entrada-contenido" aria-labelledby="titulo-entrada">
          <p className="etiqueta">TU ESTILO. TU TIEMPO.</p>
          <h1 id="titulo-entrada">Tu próxima cita empieza aquí.</h1>
          <p>
            Encuentra tu barbería o entra al espacio de trabajo de tu equipo.
          </p>
          <div className="entrada-opciones">
            <article className="entrada-opcion">
              <span className="etiqueta">PARA CLIENTES</span>
              <h2>Un espacio para ti</h2>
              <p>
                Explora servicios, elige a tu profesional y organiza tus
                reservas.
              </p>
              <button onClick={() => elegirArea("cliente")}>
                Reservar una hora
              </button>
            </article>
            <article className="entrada-opcion entrada-opcion-negocio">
              <span className="etiqueta">PARA NEGOCIOS</span>
              <h2>El espacio de tu equipo</h2>
              <p>
                Consulta tus negocios y accede a las opciones que permite tu
                membresía.
              </p>
              <button onClick={() => elegirArea("negocio")}>
                Entrar a negocios
              </button>
            </article>
          </div>
          <p className="entrada-nota">
            Una misma cuenta para reservar y formar parte de un negocio.
          </p>
        </section>
      </main>
    );
  }

  if (!sesion) {
    return (
      <main className="contenedor">
        <section className="tarjeta">
          <button
            type="button"
            className="boton-secundario"
            onClick={() => setArea(null)}
          >
            Volver al inicio
          </button>
          <p className="etiqueta">
            BARBER SAAS · {area === "cliente" ? "CLIENTES" : "NEGOCIOS"}
          </p>
          <AccesoCuenta
            key={area}
            area={area}
            avisoInicial={avisoAcceso}
            onSesionIniciada={iniciarSesion}
          />
        </section>
      </main>
    );
  }

  const opciones: { id: Vista; etiqueta: string }[] =
    area === "cliente"
      ? [
          { id: "catalogo", etiqueta: "Reservar" },
          { id: "reservas", etiqueta: "Mis reservas" },
          { id: "perfil", etiqueta: "Mi perfil" },
        ]
      : [
          { id: "negocios", etiqueta: "Mis negocios" },
          { id: "perfil", etiqueta: "Mi perfil" },
        ];

  return (
    <LayoutCliente
      area={area}
      nombreUsuario={sesion.usuario.nombre}
      opcionesMenu={opciones.map((opcion) => ({
        ...opcion,
        activa: vista === opcion.id,
        onSeleccionar: () => setVista(opcion.id),
      }))}
      {...textos[vista]}
      onCambiarArea={() =>
        elegirArea(area === "cliente" ? "negocio" : "cliente")
      }
      onCerrarSesion={() => {
        cerrarSesion();
        setArea(null);
        setVista("catalogo");
      }}
      aviso={
        area === "cliente" && vista !== "perfil" ? (
          <AvisoPerfilIncompleto onCompletar={() => setVista("perfil")} />
        ) : null
      }
    >
      {vista === "catalogo" ? (
        <CatalogoBarberias />
      ) : vista === "reservas" ? (
        <MisReservas />
      ) : vista === "negocios" ? (
        <MisNegocios />
      ) : (
        <MiPerfil />
      )}
    </LayoutCliente>
  );
}
