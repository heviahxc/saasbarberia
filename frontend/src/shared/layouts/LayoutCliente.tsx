import type { ReactNode } from 'react';

type OpcionMenu = {
  id: string;
  etiqueta: string;
  activa: boolean;
  onSeleccionar: () => void;
};

type Props = {
  nombreUsuario: string;
  opcionesMenu: OpcionMenu[];
  etiqueta: string;
  titulo: string;
  descripcion: string;
  onCerrarSesion: () => void;
  aviso?: ReactNode;
  area?: "cliente" | "negocio";
  onCambiarArea?: () => void;
  children: ReactNode;
};

export default function LayoutCliente({
  nombreUsuario,
  opcionesMenu,
  etiqueta,
  titulo,
  descripcion,
  onCerrarSesion,
  aviso,
  area = "cliente",
  onCambiarArea,
  children,
}: Props) {
  return (
    <main className="aplicacion">
      <section className="panel-cliente">
        <header className="cabecera-cliente">
          <div className="marca">
            <span className="marca-icono" aria-hidden="true">
              B
            </span>
            <span>BARBER SAAS · {area === "cliente" ? "Clientes" : "Negocios"}</span>
          </div>

          <div className="cuenta-cliente">
            {onCambiarArea && (
              <button type="button" className="boton-secundario" onClick={onCambiarArea}>
                {area === "cliente" ? "Ir a negocios" : "Ir a reservas"}
              </button>
            )}
            <span className="saludo-cliente">
              Hola, {nombreUsuario}
            </span>

            <button
              type="button"
              className="boton-secundario"
              onClick={onCerrarSesion}
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <nav className="menu-cliente" aria-label={area === "cliente" ? "Opciones del cliente" : "Opciones del negocio"}>
          {opcionesMenu.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className="boton-secundario"
              aria-pressed={opcion.activa}
              onClick={opcion.onSeleccionar}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </nav>

        <div className="contenido-cliente">
          <div className="introduccion-cliente">
            <p className="etiqueta">{etiqueta}</p>
            <h1>{titulo}</h1>
            <p>{descripcion}</p>
          </div>

          {aviso}

          <div className="superficie-cliente">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}