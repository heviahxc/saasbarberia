import { describe, expect, it } from 'vitest';
import { generarInicios } from './generar-inicios.js';

describe('generarInicios', () => {
  const fecha = '2030-01-07';
  const zona = 'America/Santiago';
  const ahora = Date.parse('2029-01-01T00:00:00Z');

  it('permite que el servicio termine justo al cerrar el tramo', () => {
    const opciones = generarInicios(
      fecha,
      zona,
      30,
      [{ inicioMinuto: 540, finMinuto: 600 }],
      ahora,
    );

    expect(opciones.map((opcion) => opcion.horaLocal)).toEqual([
      '09:00',
      '09:15',
      '09:30',
    ]);
  });

  it('no permite atravesar una pausa para completar el servicio', () => {
    const opciones = generarInicios(
      fecha,
      zona,
      120,
      [
        { inicioMinuto: 540, finMinuto: 600 },
        { inicioMinuto: 660, finMinuto: 720 },
      ],
      ahora,
    );

    expect(opciones).toEqual([]);
  });

  it('descarta opciones que ya pasaron', () => {
    const opciones = generarInicios(
      fecha,
      zona,
      30,
      [{ inicioMinuto: 540, finMinuto: 600 }],
      Date.parse('2031-01-01T00:00:00Z'),
    );

    expect(opciones).toEqual([]);
  });
});