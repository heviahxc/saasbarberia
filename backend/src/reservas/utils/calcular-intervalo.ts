import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DateTime, IANAZone } from 'luxon';

export function calcularIntervalo(
  inicioISO: string,
  duracionMinutos: number,
  zonaHoraria: string,
) {
  if (!IANAZone.isValidZone(zonaHoraria)) {
    throw new InternalServerErrorException(
      'La barbería no tiene una zona horaria válida',
    );
  }

  if (
    !Number.isInteger(duracionMinutos) ||
    duracionMinutos < 1 ||
    duracionMinutos > 1440
  ) {
    throw new BadRequestException(
      'El servicio no tiene una duración válida',
    );
  }

  if (!/(Z|[+-]\d{2}:\d{2})$/.test(inicioISO)) {
    throw new BadRequestException(
      'El inicio debe incluir una zona horaria explícita',
    );
  }

  const entrada = DateTime.fromISO(inicioISO, {
    setZone: true,
  });

  if (!entrada.isValid) {
    throw new BadRequestException('La fecha de inicio no es válida');
  }

  const inicioLocal = entrada.setZone(zonaHoraria);

  if (
    inicioLocal.second !== 0 ||
    inicioLocal.millisecond !== 0
  ) {
    throw new BadRequestException(
      'La reserva debe comenzar en un minuto exacto',
    );
  }

  if (inicioLocal.toMillis() <= Date.now()) {
    throw new BadRequestException(
      'La reserva debe comenzar en el futuro',
    );
  }

  const finLocal = inicioLocal.plus({
    minutes: duracionMinutos,
  });

  if (!finLocal.isValid) {
    throw new BadRequestException(
      'No se pudo calcular el fin de la reserva',
    );
  }

  // Limitación inicial: no aceptar citas que crucen
  // un cambio de horario de verano/invierno.
  if (inicioLocal.offset !== finLocal.offset) {
    throw new BadRequestException(
      'Por ahora no se admiten reservas que crucen un cambio de hora',
    );
  }

  const mismoDia = inicioLocal.hasSame(finLocal, 'day');

  const terminaEnMedianoche =
    finLocal.toISODate() ===
      inicioLocal.plus({ days: 1 }).toISODate() &&
    finLocal.hour === 0 &&
    finLocal.minute === 0;

  if (!mismoDia && !terminaEnMedianoche) {
    throw new BadRequestException(
      'La reserva debe terminar dentro de la jornada del mismo día',
    );
  }

  return {
    inicio: inicioLocal.toJSDate(),
    fin: finLocal.toJSDate(),
    diaSemana: inicioLocal.weekday,
    inicioMinuto: inicioLocal.hour * 60 + inicioLocal.minute,
    finMinuto: terminaEnMedianoche
      ? 1440
      : finLocal.hour * 60 + finLocal.minute,
  };
}