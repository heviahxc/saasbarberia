import { estadosReserva } from "../lib/estados-reserva.js";
import type { EstadoReserva } from "../lib/estados-reserva.js";
import "./estado-cita.css";
export default function EstadoCita({ estado }: { estado: EstadoReserva }) {
  const datos = estadosReserva[estado];
  return (
    <span className={`estado-reserva ${datos.clase}`}>{datos.etiqueta}</span>
  );
}
