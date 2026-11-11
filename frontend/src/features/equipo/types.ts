export type ProfesionalEquipo = {
  id: number;
  nombre: string;
  activo: boolean;
  miembros: { activo: boolean; usuario: { nombre: string; email: string } }[];
};
export type InvitacionEquipo = {
  id: number;
  email: string;
  profesionalId: number;
  venceEn: string;
  estado: "PENDIENTE" | "ACEPTADA" | "REVOCADA" | "VENCIDA";
};
export type Equipo = {
  profesionales: ProfesionalEquipo[];
  invitaciones: InvitacionEquipo[];
};
export type InvitacionGenerada = {
  id: number;
  email: string;
  token: string;
  venceEn: string;
};
export type DetalleInvitacion = {
  barberia: string;
  profesional: string;
  email: string;
  venceEn: string;
};

export type DatosHorario = {
  diaSemana: number;
  inicioMinuto: number;
  finMinuto: number;
};
export type HorarioProfesional = DatosHorario & {
  id: number;
  barberiaId: number;
  profesionalId: number;
};
