export function formatearFechaHora(
  fechaISO: string,
  zonaHoraria: string,
): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: zonaHoraria,
  }).format(new Date(fechaISO));
}

export function formatearPrecio(
  valor: string | number,
): string {
  const numero = Number(valor);

  return `$${numero.toLocaleString('es-CL', {
    maximumFractionDigits: 2,
  })}`;
}