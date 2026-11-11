import type { DatosHorario, HorarioProfesional } from "./types.js";
import { api } from "../../shared/lib/api.js";
import type { DetalleInvitacion, Equipo, InvitacionGenerada } from "./types.js";

export const consultarEquipo = (
  barberiaId: number,
  token: string,
  signal: AbortSignal,
) => api<Equipo>(`/barberias/${barberiaId}/equipo`, { token, signal });
export const crearProfesional = (
  barberiaId: number,
  token: string,
  nombre: string,
) =>
  api<{ id: number }>(`/barberias/${barberiaId}/profesionales`, {
    method: "POST",
    token,
    body: { nombre },
  });
export const invitarProfesional = (
  barberiaId: number,
  token: string,
  profesionalId: number,
  email: string,
) =>
  api<InvitacionGenerada>(`/barberias/${barberiaId}/equipo/invitaciones`, {
    method: "POST",
    token,
    body: { profesionalId, email },
  });
export const revocarInvitacion = (
  barberiaId: number,
  token: string,
  id: number,
) =>
  api<void>(`/barberias/${barberiaId}/equipo/invitaciones/${id}`, {
    method: "DELETE",
    token,
  });
export const consultarInvitacion = (
  invitacion: string,
  token: string,
  signal: AbortSignal,
) =>
  api<DetalleInvitacion>("/invitaciones/consultar", {
    method: "POST",
    token,
    body: { token: invitacion },
    signal,
  });
export const aceptarInvitacion = (invitacion: string, token: string) =>
  api<{ barberiaId: number; profesionalId: number; rol: "MIEMBRO" }>(
    "/invitaciones/aceptar",
    { method: "POST", token, body: { token: invitacion } },
  );

export const consultarServiciosProfesional = (
  barberiaId: number,
  profesionalId: number,
  token: string,
  signal: AbortSignal,
) =>
  api<import("../servicios/types.js").ServicioNegocio[]>(
    `/barberias/${barberiaId}/profesionales/${profesionalId}/servicios`,
    { token, signal },
  );

export const asignarServicioProfesional = (
  barberiaId: number,
  profesionalId: number,
  servicioId: number,
  token: string,
) =>
  api<{ servicioId: number }>(
    `/barberias/${barberiaId}/profesionales/${profesionalId}/servicios`,
    { method: "POST", token, body: { servicioId } },
  );

export const quitarServicioProfesional = (
  barberiaId: number,
  profesionalId: number,
  servicioId: number,
  token: string,
) =>
  api<void>(
    `/barberias/${barberiaId}/profesionales/${profesionalId}/servicios/${servicioId}`,
    { method: "DELETE", token },
  );

export const consultarHorarios = (
  barberiaId: number,
  profesionalId: number,
  token: string,
  signal: AbortSignal,
) =>
  api<HorarioProfesional[]>(
    `/barberias/${barberiaId}/profesionales/${profesionalId}/horarios`,
    { token, signal },
  );
export const agregarHorario = (
  barberiaId: number,
  profesionalId: number,
  token: string,
  body: DatosHorario,
) =>
  api<HorarioProfesional>(
    `/barberias/${barberiaId}/profesionales/${profesionalId}/horarios`,
    { method: "POST", token, body },
  );
export const eliminarHorario = (
  barberiaId: number,
  profesionalId: number,
  horarioId: number,
  token: string,
) =>
  api<void>(
    `/barberias/${barberiaId}/profesionales/${profesionalId}/horarios/${horarioId}`,
    { method: "DELETE", token },
  );
