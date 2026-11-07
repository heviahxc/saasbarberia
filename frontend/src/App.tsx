import { useState } from 'react';

import AccesoCuenta from './features/auth/components/AccesoCuenta.js';
import { useAuth } from './features/auth/auth-context.js';
import type { Sesion } from './features/auth/types.js';
import CatalogoBarberias from './features/reservas/components/CatalogoBarberias.js';
import MisReservas from './features/reservas/components/MisReservas.js';
import MiPerfil from './features/perfil/MiPerfil.js';
import AvisoPerfilIncompleto from './features/perfil/AvisoPerfilIncompleto.js';
import LayoutCliente from './shared/layouts/LayoutCliente.js';

type Vista = 'catalogo' | 'reservas' | 'perfil';

const textosVista = {
  catalogo: {
    etiqueta: 'TU PRÓXIMA CITA',
    titulo: 'Un momento para ti',
    descripcion:
      'Elige tu barbería, encuentra tu servicio y reserva una hora.',
  },
  reservas: {
    etiqueta: 'TU AGENDA',
    titulo: 'Tus citas, en un solo lugar',
    descripcion:
      'Consulta tus reservas y organiza tu próxima visita.',
  },
  perfil: {
    etiqueta: 'TU CUENTA',
    titulo: 'Tus datos personales',
    descripcion:
      'Mantén tu información de contacto actualizada.',
  },
};

function App() {
  const {
    sesion,
    avisoAcceso,
    iniciarSesion,
    cerrarSesion: cerrarSesionActual,
   
  } = useAuth();

  const [vista, setVista] = useState<Vista>('catalogo');

  function recibirSesion(nuevaSesion: Sesion) {
    setVista('catalogo');
    iniciarSesion(nuevaSesion);
  }

  function cerrarSesion() {
    setVista('catalogo');
    cerrarSesionActual();
  }

  if (!sesion) {
    return (
      <main className="contenedor">
        <section className="tarjeta">
          <p className="etiqueta">BARBER SAAS</p>

          <AccesoCuenta
            avisoInicial={avisoAcceso}
            onSesionIniciada={recibirSesion}
          />
        </section>
      </main>
    );
  }

  return (
    <LayoutCliente
      nombreUsuario={sesion.usuario.nombre}
      opcionesMenu={[
        {
          id: 'catalogo',
          etiqueta: 'Reservar',
          activa: vista === 'catalogo',
          onSeleccionar: () => setVista('catalogo'),
        },
        {
          id: 'reservas',
          etiqueta: 'Mis reservas',
          activa: vista === 'reservas',
          onSeleccionar: () => setVista('reservas'),
        },
        {
          id: 'perfil',
          etiqueta: 'Mi perfil',
          activa: vista === 'perfil',
          onSeleccionar: () => setVista('perfil'),
        },
      ]}
      etiqueta={textosVista[vista].etiqueta}
      titulo={textosVista[vista].titulo}
      descripcion={textosVista[vista].descripcion}
      onCerrarSesion={cerrarSesion}
      aviso={
        vista !== 'perfil' ? (
        <AvisoPerfilIncompleto
  onCompletar={() => setVista('perfil')}
/>
        ) : null
      }
    >
      {vista === 'catalogo' ? (
        <CatalogoBarberias />
      ) : vista === 'reservas' ? (
        <MisReservas />
      ) : (
        <MiPerfil />
      )}
    </LayoutCliente>
  );
}

export default App;