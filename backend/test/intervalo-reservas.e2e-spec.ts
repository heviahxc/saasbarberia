import { DateTime } from 'luxon';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Intervalo de reservas por barbería', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let verificada = false;
  const marca = randomUUID();
  const usuarios: number[] = [];
  const negocios: number[] = [];
  let admin: string;
  let otroAdmin: string;
  let miembro: string;
  let miembroId: number;
  let barberiaId: number;
  let otraBarberiaId: number;
  let servicioId: number;
  const datos = {
    nombre: 'Corte clásico',
    duracionMinutos: 30,
    precio: '15000',
  };

  const servidor = () => app.getHttpServer();
  async function cuenta(prefijo: string) {
    const email = `${prefijo}-${marca}@example.com`;
    const password = 'Prueba-servicios-2026!';
    const registro = await request(servidor())
      .post('/auth/registro')
      .send({
        nombre: 'Persona de prueba',
        apellidoPaterno: 'Torres',
        telefono: '+56912345678',
        email,
        password,
      })
      .expect(201);
    usuarios.push(registro.body.id);
    const login = await request(servidor())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return {
      id: registro.body.id as number,
      token: login.body.accessToken as string,
    };
  }
  async function negocio(token: string) {
    const r = await request(servidor())
      .post('/barberias')
      .auth(token, { type: 'bearer' })
      .send({
        nombre: `Servicios ${marca}`,
        ciudad: 'Linares',
        direccion: 'Central 123',
      })
      .expect(201);
    negocios.push(r.body.id);
    return r.body.id as number;
  }

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    await app.init();
    prisma = app.get(PrismaService);
    const db = await prisma.$queryRaw<
      { base: string }[]
    >`SELECT current_database() AS base`;
    expect(db[0].base).toBe('barber_saas_test');
    verificada = true;
    admin = (await cuenta('admin-servicios')).token;
    otroAdmin = (await cuenta('otro-admin-servicios')).token;
    const m = await cuenta('miembro-servicios');
    miembro = m.token;
    miembroId = m.id;
    barberiaId = await negocio(admin);
    otraBarberiaId = await negocio(otroAdmin);
    await prisma.miembroBarberia.create({
      data: { usuarioId: miembroId, barberiaId, rol: 'MIEMBRO' },
    });
    servicioId = (
      await prisma.servicio.create({ data: { ...datos, barberiaId } })
    ).id;
  });

  afterAll(async () => {
    try {
      if (verificada)
        await prisma.$transaction(async (tx) => {
          await tx.reagendamientoReserva.deleteMany({ where: { reserva: { barberiaId: { in: negocios } } } });
          await tx.reserva.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.miembroBarberia.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.profesionalServicio.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.horarioProfesional.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.profesional.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.servicio.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.barberia.deleteMany({ where: { id: { in: negocios } } });
          await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
        });
    } finally {
      await app?.close();
    }
  });


  const cuerpo = { nombre: 'Barbería intervalos', ciudad: 'Linares', direccion: 'Central 123' };
  const configurar = (intervaloReservasMinutos: unknown, cuenta = admin) => request(servidor()).patch(`/barberias/${barberiaId}`).auth(cuenta, { type: 'bearer' }).send({ ...cuerpo, intervaloReservasMinutos });

  it('usa 15 por defecto, valida opciones y exige administrador del negocio', async () => {
    const inicial = await request(servidor()).get(`/barberias/${barberiaId}`).auth(admin, { type: 'bearer' }).expect(200);
    expect(inicial.body.intervaloReservasMinutos).toBe(15);
    for (const valor of [0, 20, 60, null, '30']) await configurar(valor).expect(400);
    await configurar(30, miembro).expect(403);
    await configurar(30, otroAdmin).expect(403);
    await configurar(30).expect(200);
    expect((await prisma.barberia.findUniqueOrThrow({ where: { id: otraBarberiaId } })).intervaloReservasMinutos).toBe(15);
    await request(servidor()).patch(`/barberias/${barberiaId}`).auth(admin, { type: 'bearer' }).send(cuerpo).expect(200);
    expect((await prisma.barberia.findUniqueOrThrow({ where: { id: barberiaId } })).intervaloReservasMinutos).toBe(30);
  });

  it('aplica el intervalo al reservar y reagendar conservando citas y duración acordada', async () => {
    await configurar(15).expect(200);
    await prisma.servicio.update({ where: { id: servicioId }, data: { duracionMinutos: 45 } });
    const profesional = await prisma.profesional.create({ data: { barberiaId, nombre: 'Profesional intervalos' } });
    await prisma.profesionalServicio.create({ data: { barberiaId, profesionalId: profesional.id, servicioId } });
    const dia = DateTime.now().setZone('America/Santiago').plus({ days: 10 }).startOf('day');
    await prisma.horarioProfesional.create({ data: { barberiaId, profesionalId: profesional.id, diaSemana: dia.weekday, inicioMinuto: 540, finMinuto: 780 } });
    const inicio = (h: number, m: number) => dia.set({ hour: h, minute: m }).toUTC().toISO()!;
    const ruta = `/barberias/${barberiaId}/reservas`;
    const disponibles = () => request(servidor()).get(`${ruta}/disponibilidad?fecha=${dia.toISODate()}&profesionalId=${profesional.id}&servicioId=${servicioId}`).auth(miembro, { type: 'bearer' });
    expect(JSON.stringify((await disponibles().expect(200)).body)).toContain('09:15');
    const reserva = await request(servidor()).post(ruta).auth(miembro, { type: 'bearer' }).send({ profesionalId: profesional.id, servicioId, inicio: inicio(9, 15) }).expect(201);
    const original = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.body.id } });
    await configurar(30).expect(200);
    expect(await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.body.id } })).toEqual(original);
    const json = JSON.stringify((await disponibles().expect(200)).body);
    expect(json).not.toContain('09:15'); expect(json).not.toContain('09:30'); expect(json).toContain('10:00');
    await request(servidor()).post(ruta).auth(miembro, { type: 'bearer' }).send({ profesionalId: profesional.id, servicioId, inicio: inicio(11, 15) }).expect(400);
    await request(servidor()).post(ruta).auth(miembro, { type: 'bearer' }).send({ profesionalId: profesional.id, servicioId, inicio: inicio(11, 0) }).expect(201);
    await prisma.servicio.update({ where: { id: servicioId }, data: { duracionMinutos: 120 } });
    const reagendar = await request(servidor()).get(`/reservas/${reserva.body.id}/disponibilidad?fecha=${dia.toISODate()}`).auth(miembro, { type: 'bearer' }).expect(200);
    expect(JSON.stringify(reagendar.body)).not.toContain('09:15');
    expect(JSON.stringify(reagendar.body)).toContain('10:00');
    await request(servidor()).patch(`/reservas/${reserva.body.id}/reagendar`).auth(miembro, { type: 'bearer' }).send({ inicio: inicio(10, 15) }).expect(400);
    await request(servidor()).patch(`/reservas/${reserva.body.id}/reagendar`).auth(miembro, { type: 'bearer' }).send({ inicio: inicio(10, 0) }).expect(200);
    const movida = await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.body.id } });
    expect(movida.duracionMinutos).toBe(45);
    expect(movida.fin.getTime() - movida.inicio.getTime()).toBe(45 * 60000);
  });
});
