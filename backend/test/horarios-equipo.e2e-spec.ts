import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Horarios del equipo', () => {
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

  async function profesional() {
    const p = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Profesional horarios' },
    });
    return {
      id: p.id,
      ruta: `/barberias/${barberiaId}/profesionales/${p.id}/horarios`,
    };
  }

  it('permite descansos, límites contiguos y fin a medianoche, y rechaza solapamientos', async () => {
    const p = await profesional();
    for (const [inicioMinuto, finMinuto] of [
      [540, 780],
      [840, 1080],
      [1080, 1440],
    ]) {
      await request(servidor())
        .post(p.ruta)
        .auth(admin, { type: 'bearer' })
        .send({ diaSemana: 1, inicioMinuto, finMinuto })
        .expect(201);
    }
    await request(servidor())
      .post(p.ruta)
      .auth(admin, { type: 'bearer' })
      .send({ diaSemana: 1, inicioMinuto: 600, finMinuto: 800 })
      .expect(409);
    await request(servidor())
      .post(p.ruta)
      .auth(admin, { type: 'bearer' })
      .send({ diaSemana: 1, inicioMinuto: 540, finMinuto: 780 })
      .expect(409);
    const lista = await request(servidor())
      .get(p.ruta)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(
      lista.body.map((h: { inicioMinuto: number }) => h.inicioMinuto),
    ).toEqual([540, 840, 1080]);
    await request(servidor())
      .delete(`${p.ruta}/${lista.body[0].id}`)
      .auth(admin, { type: 'bearer' })
      .expect(204);
    expect(
      await prisma.horarioProfesional.count({ where: { profesionalId: p.id } }),
    ).toBe(2);
  });

  it('valida días, minutos y orden de las horas', async () => {
    const p = await profesional();
    const correcto = { diaSemana: 2, inicioMinuto: 540, finMinuto: 780 };
    for (const datos of [
      { ...correcto, diaSemana: 0 },
      { ...correcto, diaSemana: 8 },
      { ...correcto, inicioMinuto: -1 },
      { ...correcto, inicioMinuto: 540.5 },
      { ...correcto, finMinuto: 1441 },
      { ...correcto, finMinuto: 540 },
      { ...correcto, finMinuto: 500 },
      { ...correcto, barberiaId: otraBarberiaId },
    ])
      await request(servidor())
        .post(p.ruta)
        .auth(admin, { type: 'bearer' })
        .send(datos)
        .expect(400);
    expect(
      await prisma.horarioProfesional.count({ where: { profesionalId: p.id } }),
    ).toBe(0);
  });

  it('exige administrador y evita modificar horarios de otros negocios o profesionales', async () => {
    const p = await profesional();
    const datos = { diaSemana: 3, inicioMinuto: 540, finMinuto: 780 };
    await request(servidor()).post(p.ruta).send(datos).expect(401);
    const tramo = await request(servidor())
      .post(p.ruta)
      .auth(admin, { type: 'bearer' })
      .send(datos)
      .expect(201);
    for (const cuenta of [miembro, otroAdmin]) {
      await request(servidor())
        .post(p.ruta)
        .auth(cuenta, { type: 'bearer' })
        .send(datos)
        .expect(403);
      await request(servidor())
        .delete(`${p.ruta}/${tramo.body.id}`)
        .auth(cuenta, { type: 'bearer' })
        .expect(403);
    }
    const ajeno = await prisma.profesional.create({
      data: { barberiaId: otraBarberiaId, nombre: 'Profesional ajeno' },
    });
    await request(servidor())
      .post(`/barberias/${barberiaId}/profesionales/${ajeno.id}/horarios`)
      .auth(admin, { type: 'bearer' })
      .send(datos)
      .expect(404);
    const otro = await profesional();
    await request(servidor())
      .delete(`${otro.ruta}/${tramo.body.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(404);
    expect(
      await prisma.horarioProfesional.findUnique({
        where: { id: tramo.body.id },
      }),
    ).not.toBeNull();
  });

  it('conserva el tramo y la reserva cuando hay citas confirmadas pendientes', async () => {
    const p = await profesional();
    const tramo = await request(servidor())
      .post(p.ruta)
      .auth(admin, { type: 'bearer' })
      .send({ diaSemana: 4, inicioMinuto: 540, finMinuto: 780 })
      .expect(201);
    const inicio = new Date(Date.now() + 86400000);
    const reserva = await prisma.reserva.create({
      data: {
        barberiaId,
        profesionalId: p.id,
        servicioId,
        clienteId: miembroId,
        inicio,
        fin: new Date(inicio.getTime() + 1800000),
        duracionMinutos: 30,
        precioAcordado: '15000',
        nombreServicio: datos.nombre,
        zonaHoraria: 'America/Santiago',
      },
    });
    await request(servidor())
      .delete(`${p.ruta}/${tramo.body.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(409);
    expect(
      await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } }),
    ).toEqual(reserva);
    expect(
      await prisma.horarioProfesional.findUnique({
        where: { id: tramo.body.id },
      }),
    ).not.toBeNull();
    await prisma.reserva.update({
      where: { id: reserva.id },
      data: { estado: 'CANCELADA', canceladoEn: new Date() },
    });
    await request(servidor())
      .delete(`${p.ruta}/${tramo.body.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(204);
  });

  it('rechaza uno de dos tramos superpuestos creados simultáneamente', async () => {
    const p = await profesional();
    const respuestas = await Promise.all([
      request(servidor())
        .post(p.ruta)
        .auth(admin, { type: 'bearer' })
        .send({ diaSemana: 5, inicioMinuto: 540, finMinuto: 780 }),
      request(servidor())
        .post(p.ruta)
        .auth(admin, { type: 'bearer' })
        .send({ diaSemana: 5, inicioMinuto: 600, finMinuto: 840 }),
    ]);
    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(
      await prisma.horarioProfesional.count({ where: { profesionalId: p.id } }),
    ).toBe(1);
  });
});
