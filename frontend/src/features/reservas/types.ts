export type Reserva = {
  id: number;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  precioAcordado: string;
  nombreServicio: string;
  zonaHoraria: string;
  estado: 'CONFIRMADA' | 'CANCELADA';
  creadoEn: string;
  canceladoEn: string | null;
  barberia: {
    id: number;
    nombre: string;
    ciudad: string;
    direccion: string | null;
  };
  profesional: {
    id: number;
    nombre: string;
  };
};