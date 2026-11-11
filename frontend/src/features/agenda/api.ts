import { api } from "../../shared/lib/api.js";
import type { Agenda } from "./types.js";
export const consultarAgenda = (
  barberiaId: number,
  fecha: string,
  token: string,
  signal: AbortSignal,
) =>
  api<Agenda>(
    `/barberias/${barberiaId}/reservas?fecha=${encodeURIComponent(fecha)}`,
    { token, signal },
  );
