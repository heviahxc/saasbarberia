import { describe, expect, it } from 'vitest';

import {
  intervalosSeSuperponen,
} from './intervalos-se-superponen.js';

const instante = (hora: string) =>
  Date.parse(`2030-01-07T${hora}:00Z`);

describe('intervalosSeSuperponen', () => {
  it.each([
    ['intervalos idénticos', '09:00', '09:30', '09:00', '09:30', true],
    ['cruce parcial', '09:00', '09:30', '09:15', '09:45', true],
    ['un intervalo contiene al otro', '09:00', '11:00', '09:30', '10:00', true],
    ['un intervalo está contenido', '09:30', '10:00', '09:00', '11:00', true],
    ['el segundo empieza al terminar el primero', '09:00', '09:30', '09:30', '10:00', false],
    ['el primero empieza al terminar el segundo', '09:30', '10:00', '09:00', '09:30', false],
    ['intervalos separados', '09:00', '09:30', '10:00', '10:30', false],
  ])('%s', (_caso, inicioA, finA, inicioB, finB, esperado) => {
    expect(
      intervalosSeSuperponen(
        instante(inicioA),
        instante(finA),
        instante(inicioB),
        instante(finB),
      ),
    ).toBe(esperado);
  });

  it('detecta un bloqueo que comienza el día anterior', () => {
    expect(
      intervalosSeSuperponen(
        Date.parse('2030-01-07T09:00:00Z'),
        Date.parse('2030-01-07T09:30:00Z'),
        Date.parse('2030-01-06T22:00:00Z'),
        Date.parse('2030-01-07T10:00:00Z'),
      ),
    ).toBe(true);
  });

  it('compara el mismo instante expresado con distintas zonas', () => {
    expect(
      intervalosSeSuperponen(
        Date.parse('2030-01-07T09:00:00-03:00'),
        Date.parse('2030-01-07T09:30:00-03:00'),
        Date.parse('2030-01-07T12:00:00Z'),
        Date.parse('2030-01-07T12:30:00Z'),
      ),
    ).toBe(true);
  });
});