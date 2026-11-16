export type EstadoReserva =
  "CONFIRMADA" | "CANCELADA" | "ATENDIDA" | "NO_ASISTIO";
export const estadosReserva: Record<
  EstadoReserva,
  { etiqueta: string; clase: string }
> = {
  CONFIRMADA: { etiqueta: "Confirmada", clase: "estado-confirmada" },
  CANCELADA: { etiqueta: "Cancelada", clase: "estado-cancelada" },
  ATENDIDA: { etiqueta: "Atendida", clase: "estado-atendida" },
  NO_ASISTIO: { etiqueta: "No asistió", clase: "estado-ausente" },
};
