export type CitaAgenda = {
  id: number;
  inicio: string;
  fin: string;
  nombreServicio: string;
  duracionMinutos: number;
  precioAcordado: string;
  estado: "CONFIRMADA" | "CANCELADA";
  cliente: { id: number; nombre: string };
  profesional: { id: number; nombre: string };
};
export type Agenda = {
  fecha: string;
  zonaHoraria: string;
  reservas: CitaAgenda[];
};
