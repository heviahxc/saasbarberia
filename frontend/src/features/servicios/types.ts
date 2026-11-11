export type DatosServicio = {
  nombre: string;
  duracionMinutos: number;
  precio: string;
};
export type ServicioNegocio = DatosServicio & {
  id: number;
  barberiaId: number;
  activo: boolean;
};
