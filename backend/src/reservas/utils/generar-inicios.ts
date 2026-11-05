import { DateTime } from 'luxon';

type TramoHorario = {
  inicioMinuto: number;
  finMinuto: number;
};

type OpcionHorario = {
  inicio: string;
  fin: string;
  horaLocal: string;
};

export function generarInicios(
  fecha: string,
  zonaHoraria: string,
  duracionMinutos: number,
  tramos: TramoHorario[],
  ahoraMillis = Date.now(),
): OpcionHorario[] {
  const dia = DateTime.fromISO(fecha, {
    zone: zonaHoraria,
  });

  if (
    !dia.isValid ||
    dia.toISODate() !== fecha ||
    !Number.isInteger(duracionMinutos) ||
    duracionMinutos < 1 ||
    duracionMinutos > 1440
  ) {
    throw new Error('Datos inválidos para generar horarios');
  }

  const opciones = new Map<string, OpcionHorario>();

  for (const tramo of tramos) {
    // Alinear con minutos 00, 15, 30 y 45.
    const primerMinuto =
      Math.ceil(tramo.inicioMinuto / 15) * 15;

    for (
      let minuto = primerMinuto;
      minuto + duracionMinutos <= tramo.finMinuto;
      minuto += 15
    ) {
      const hora = Math.floor(minuto / 60);
      const minutos = minuto % 60;

      const inicio = dia.set({
        hour: hora,
        minute: minutos,
        second: 0,
        millisecond: 0,
      });

      // Algunos cambios de hora eliminan horas locales.
      if (
        !inicio.isValid ||
        inicio.toISODate() !== fecha ||
        inicio.hour !== hora ||
        inicio.minute !== minutos
      ) {
        continue;
      }

      // No ofrecer horas locales ambiguas en esta primera versión.
      if (inicio.getPossibleOffsets().length !== 1) {
        continue;
      }

      if (inicio.toMillis() <= ahoraMillis) {
        continue;
      }

      const fin = inicio.plus({
        minutes: duracionMinutos,
      });

      // Misma limitación inicial que calcularIntervalo().
      if (!fin.isValid || inicio.offset !== fin.offset) {
        continue;
      }

      const inicioISO = inicio.toUTC().toISO();
      const finISO = fin.toUTC().toISO();

      if (!inicioISO || !finISO) {
        continue;
      }

      opciones.set(inicioISO, {
        inicio: inicioISO,
        fin: finISO,
        horaLocal: inicio.toFormat('HH:mm'),
      });
    }
  }

  return [...opciones.values()].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  );
}