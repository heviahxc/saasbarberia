import { api } from "../../shared/lib/api.js";
import type { DatosServicio, ServicioNegocio } from "./types.js";

export const consultarServicios = (
  barberiaId: number,
  token: string,
  signal: AbortSignal,
) =>
  api<ServicioNegocio[]>(`/barberias/${barberiaId}/servicios`, {
    token,
    signal,
  });

export const guardarServicio = (
  barberiaId: number,
  token: string,
  datos: DatosServicio,
  servicioId?: number,
) =>
  api<ServicioNegocio>(
    `/barberias/${barberiaId}/servicios${servicioId === undefined ? "" : `/${servicioId}`}`,
    {
      method: servicioId === undefined ? "POST" : "PATCH",
      token,
      body: datos,
    },
  );

export const cambiarEstadoServicio = (
  barberiaId: number,
  token: string,
  servicioId: number,
  activo: boolean,
) =>
  api<Pick<ServicioNegocio, "id" | "barberiaId" | "activo">>(
    `/barberias/${barberiaId}/servicios/${servicioId}/estado`,
    {
      method: "PATCH",
      token,
      body: { activo },
    },
  );
