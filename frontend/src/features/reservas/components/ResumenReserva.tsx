import {
  formatearFechaHora,
  formatearPrecio,
} from '../../../shared/lib/formatos.js';

type Props = {
  nombreBarberia: string;
  nombreServicio: string;
  nombreProfesional: string;
  duracionMinutos: number;
  precio: string;
  inicio?: string;
  zonaHoraria?: string;
  confirmando: boolean;
  puedeConfirmar: boolean;
  onConfirmar: () => void;
};

export default function ResumenReserva({
  nombreBarberia,
  nombreServicio,
  nombreProfesional,
  duracionMinutos,
  precio,
  inicio,
  zonaHoraria,
  confirmando,
  puedeConfirmar,
  onConfirmar,
}: Props) {
  return (
    <aside className="resumen-cita" aria-label="Resumen de tu reserva">
      <h2>Tu reserva</h2>

      <dl className="resumen-reserva">
        <dt>Barbería</dt>
        <dd>{nombreBarberia}</dd>

        <dt>Servicio</dt>
        <dd>{nombreServicio}</dd>

        <dt>Profesional</dt>
        <dd>{nombreProfesional}</dd>

        <dt>Duración</dt>
        <dd>{duracionMinutos} minutos</dd>

        <dt>Fecha y hora</dt>
        <dd>
          {inicio && zonaHoraria
            ? formatearFechaHora(inicio, zonaHoraria)
            : 'Selecciona una fecha y una hora'}
        </dd>

        {zonaHoraria && (
          <>
            <dt>Zona horaria</dt>
            <dd>{zonaHoraria}</dd>
          </>
        )}
      </dl>

      <div className="precio-resumen">
        <span>Precio del servicio</span>
        <strong>{formatearPrecio(precio)}</strong>
      </div>

      <p className="nota-resumen">
        El importe final se mostrará al confirmar la reserva.
      </p>

      <button
        type="button"
        className="confirmar-resumen"
        onClick={onConfirmar}
        disabled={!puedeConfirmar || confirmando}
      >
        {confirmando ? 'Confirmando…' : 'Confirmar reserva'}
      </button>

      <p className="nota-resumen">
        La hora queda reservada cuando recibes la confirmación.
      </p>
    </aside>
  );
}