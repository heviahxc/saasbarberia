import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { calcularIntervalo } from './calcular-intervalo.js';

describe('calcularIntervalo', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(
      Date.parse('2026-11-01T00:00:00Z'),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('conserva el instante UTC y calcula la hora local de Santiago', () => {
    const resultado = calcularIntervalo(
      '2026-11-09T12:00:00.000Z',
      30,
      'America/Santiago',
    );

    expect(resultado.inicio.toISOString()).toBe(
      '2026-11-09T12:00:00.000Z',
    );
    expect(resultado.fin.toISOString()).toBe(
      '2026-11-09T12:30:00.000Z',
    );

    expect(resultado.diaSemana).toBe(1);
    expect(resultado.inicioMinuto).toBe(540);
    expect(resultado.finMinuto).toBe(570);
  });

  it('interpreta igual una fecha con desplazamiento explícito', () => {
    const resultado = calcularIntervalo(
      '2026-11-09T09:00:00-03:00',
      30,
      'America/Santiago',
    );

    expect(resultado.inicio.toISOString()).toBe(
      '2026-11-09T12:00:00.000Z',
    );
    expect(resultado.inicioMinuto).toBe(540);
  });

  it('calcula las dos horas de un servicio largo', () => {
    const resultado = calcularIntervalo(
      '2026-11-09T10:00:00Z',
      120,
      'UTC',
    );

    expect(resultado.fin.toISOString()).toBe(
      '2026-11-09T12:00:00.000Z',
    );
    expect(resultado.inicioMinuto).toBe(600);
    expect(resultado.finMinuto).toBe(720);
  });

  it('permite terminar exactamente a medianoche', () => {
    const resultado = calcularIntervalo(
      '2026-11-09T23:30:00Z',
      30,
      'UTC',
    );

    expect(resultado.fin.toISOString()).toBe(
      '2026-11-10T00:00:00.000Z',
    );
    expect(resultado.diaSemana).toBe(1);
    expect(resultado.finMinuto).toBe(1440);
  });

  it('rechaza una cita que continúa dentro del día siguiente', () => {
    expect(() =>
      calcularIntervalo(
        '2026-11-09T23:30:00Z',
        60,
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    '2026-10-31T23:59:00Z',
    '2026-11-01T00:00:00Z',
  ])('rechaza un inicio pasado o igual al momento actual: %s', (inicio) => {
    expect(() =>
      calcularIntervalo(inicio, 30, 'UTC'),
    ).toThrow(BadRequestException);
  });

  it('rechaza una fecha sin zona explícita', () => {
    expect(() =>
      calcularIntervalo(
        '2026-11-09T09:00:00',
        30,
        'America/Santiago',
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza segundos distintos de cero', () => {
    expect(() =>
      calcularIntervalo(
        '2026-11-09T09:00:15Z',
        30,
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([0, -30, 1.5, 1441])(
    'rechaza una duración inválida: %s',
    (duracion) => {
      expect(() =>
        calcularIntervalo(
          '2026-11-09T09:00:00Z',
          duracion,
          'UTC',
        ),
      ).toThrow(BadRequestException);
    },
  );

  it('detecta una zona horaria mal configurada', () => {
    expect(() =>
      calcularIntervalo(
        '2026-11-09T09:00:00Z',
        30,
        'Zona/Inexistente',
      ),
    ).toThrow(InternalServerErrorException);
  });
});