import type { Reserva } from '../types.js';
import { formatearPrecio } from '../../../shared/lib/formatos.js';
import '../reservas.css';

type Props = {
  reservas: Reserva[];
  onVerDetalle: (reservaId: number) => void;
};

function fechaCompacta(reserva: Reserva): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: reserva.zonaHoraria,
  }).format(new Date(reserva.inicio));
}

function EstadoReserva({ reserva }: { reserva: Reserva }) {
  return (
    <span
      className={`estado-reserva ${
        reserva.estado === 'CONFIRMADA'
          ? 'estado-confirmada'
          : 'estado-cancelada'
      }`}
    >
      {reserva.estado === 'CONFIRMADA' ? 'Confirmada' : 'Cancelada'}
    </span>
  );
}

export default function ListadoReservas({
  reservas,
  onVerDetalle,
}: Props) {
  return (
    <div className="listado-reservas">
      <p className="nota-resumen">
        Las horas corresponden a la zona horaria de cada barbería.
      </p>

      <div className="reservas-escritorio">
        <table className="tabla-reservas">
          <caption className="solo-lectores">
            Tus reservas
          </caption>

          <thead>
            <tr>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Servicio</th>
              <th scope="col">Barbería / profesional</th>
              <th scope="col">Precio</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id}>
                <td>
                  <time dateTime={reserva.inicio}>
                    {fechaCompacta(reserva)}
                  </time>
                </td>

                <td>
                  <strong>{reserva.nombreServicio}</strong>
                  <small>{reserva.duracionMinutos} minutos</small>
                </td>

                <td>
                  <strong>{reserva.barberia.nombre}</strong>
                  <small>{reserva.profesional.nombre}</small>
                </td>

                <td>{formatearPrecio(reserva.precioAcordado)}</td>

                <td>
                  <EstadoReserva reserva={reserva} />
                </td>

                <td>
                  <button
                    type="button"
                    className="boton-secundario"
                    aria-label={`Ver detalle de la reserva ${reserva.id}`}
                    onClick={() => onVerDetalle(reserva.id)}
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="reservas-movil">
        {reservas.map((reserva) => (
          <li key={reserva.id} className="reserva-compacta">
            <div className="reserva-compacta-cabecera">
              <time dateTime={reserva.inicio}>
                {fechaCompacta(reserva)}
              </time>
              <EstadoReserva reserva={reserva} />
            </div>

            <h3>{reserva.nombreServicio}</h3>
            <p>
              {reserva.barberia.nombre} · {reserva.profesional.nombre}
            </p>

            <div className="reserva-compacta-pie">
              <strong>
                {formatearPrecio(reserva.precioAcordado)}
              </strong>

              <button
                type="button"
                className="boton-secundario"
                aria-label={`Ver detalle de la reserva ${reserva.id}`}
                onClick={() => onVerDetalle(reserva.id)}
              >
                Ver detalle
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}