export function intervalosSeSuperponen(
  inicioA: number,
  finA: number,
  inicioB: number,
  finB: number,
): boolean {
  return inicioA < finB && finA > inicioB;
}