import 'reflect-metadata';
import { randomUUID, createHash } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Invitaciones del equipo', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseVerificada = false;
  const marca = randomUUID();
  const usuarios: number[] = [];
  const negocios: number[] = [];
  let admin: string;
  let ajeno: string;
  let invitado: string;
  let emailInvitado: string;
  let usuarioInvitado: number;

  async function registrar(prefijo: string) {
    const email = `${prefijo}-${marca}@example.com`;
    const password = 'Prueba-equipo-2026!';
    const registro = await request(app.getHttpServer())
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
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return {
      id: registro.body.id as number,
      email,
      token: login.body.accessToken as string,
    };
  }

  async function preparar() {
    const negocio = await request(app.getHttpServer())
      .post('/barberias')
      .auth(admin, { type: 'bearer' })
      .send({
        nombre: `Equipo ${marca}`,
        ciudad: 'Linares',
        direccion: 'Central 123',
      })
      .expect(201);
    const barberiaId = negocio.body.id as number;
    negocios.push(barberiaId);
    const p = await request(app.getHttpServer())
      .post(`/barberias/${barberiaId}/profesionales`)
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'Profesional invitado' })
      .expect(201);
    return { barberiaId, profesionalId: p.body.id as number };
  }
  async function generar(barberiaId: number, profesionalId: number) {
    const r = await request(app.getHttpServer())
      .post(`/barberias/${barberiaId}/equipo/invitaciones`)
      .auth(admin, { type: 'bearer' })
      .send({ profesionalId, email: `  ${emailInvitado.toUpperCase()}  ` })
      .expect(201);
    return r.body as {
      id: number;
      token: string;
      venceEn: string;
      email: string;
    };
  }
  const aceptar = (token: string, cuenta = invitado) =>
    request(app.getHttpServer())
      .post('/invitaciones/aceptar')
      .auth(cuenta, { type: 'bearer' })
      .send({ token });

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
    baseVerificada = true;
    admin = (await registrar('admin-equipo')).token;
    ajeno = (await registrar('ajeno-equipo')).token;
    const cuenta = await registrar('invitado-equipo');
    invitado = cuenta.token;
    emailInvitado = cuenta.email;
    usuarioInvitado = cuenta.id;
  });

  afterAll(async () => {
    try {
      if (baseVerificada)
        await prisma.$transaction(async (tx) => {
          await tx.invitacionEquipo.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.reserva.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.miembroBarberia.deleteMany({
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

  it('exige administrador del negocio y valida los datos sin aceptar un rol enviado', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const url = `/barberias/${barberiaId}/equipo/invitaciones`;
    const datos = { profesionalId, email: emailInvitado };
    await request(app.getHttpServer()).post(url).send(datos).expect(401);
    await request(app.getHttpServer())
      .post(url)
      .auth(ajeno, { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/barberias/${barberiaId}/equipo`)
      .auth(ajeno, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(url)
      .auth(admin, { type: 'bearer' })
      .send({ ...datos, rol: 'ADMINISTRADOR' })
      .expect(400);
    await request(app.getHttpServer())
      .post(url)
      .auth(admin, { type: 'bearer' })
      .send({ ...datos, email: 'incorrecto' })
      .expect(400);
    const otra = await preparar();
    await request(app.getHttpServer())
      .post(url)
      .auth(admin, { type: 'bearer' })
      .send({ ...datos, profesionalId: otra.profesionalId })
      .expect(404);
    await request(app.getHttpServer())
      .post('/invitaciones/aceptar')
      .auth(invitado, { type: 'bearer' })
      .send({ token: 'incorrecto' })
      .expect(400);
  });

  it('guarda solo el hash, exige el correo invitado y vincula con rol de miembro una sola vez', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const i = await generar(barberiaId, profesionalId);
    expect(i.email).toBe(emailInvitado);
    expect(new Date(i.venceEn).getTime() - Date.now()).toBeGreaterThan(
      71 * 3600 * 1000,
    );
    const guardada = await prisma.invitacionEquipo.findUniqueOrThrow({
      where: { id: i.id },
    });
    expect(guardada.tokenHash).toBe(
      createHash('sha256').update(i.token).digest('hex'),
    );
    expect(guardada.tokenHash).not.toBe(i.token);
    await aceptar(i.token, ajeno).expect(403);
    await request(app.getHttpServer())
      .post('/invitaciones/consultar')
      .auth(invitado, { type: 'bearer' })
      .send({ token: i.token })
      .expect(200);
    await aceptar(i.token).expect(200);
    await aceptar(i.token).expect(410);
    const m = await prisma.miembroBarberia.findUniqueOrThrow({
      where: {
        usuarioId_barberiaId: { usuarioId: usuarioInvitado, barberiaId },
      },
    });
    expect(m).toMatchObject({ rol: 'MIEMBRO', activo: true, profesionalId });
    const lista = await request(app.getHttpServer())
      .get(`/barberias/${barberiaId}/equipo`)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(lista.body.invitaciones[0]).not.toHaveProperty('tokenHash');
    expect(lista.body.invitaciones[0]).not.toHaveProperty('token');
    expect(lista.body.invitaciones[0].estado).toBe('ACEPTADA');
    await request(app.getHttpServer())
      .get(`/barberias/${barberiaId}/equipo`)
      .auth(invitado, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/barberias/${barberiaId}/equipo/invitaciones`)
      .auth(invitado, { type: 'bearer' })
      .send({ profesionalId, email: emailInvitado })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/barberias/${barberiaId}`)
      .auth(invitado, { type: 'bearer' })
      .send({ nombre: 'Modificado', ciudad: 'Linares', direccion: 'Central' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/barberias/${barberiaId}/profesionales`)
      .auth(invitado, { type: 'bearer' })
      .send({ nombre: 'Otro' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/barberias/${barberiaId}/equipo/invitaciones`)
      .auth(admin, { type: 'bearer' })
      .send({ profesionalId, email: emailInvitado })
      .expect(409);
  });

  it('rechaza enlaces revocados, vencidos o reemplazados sin crear membresías', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const vieja = await generar(barberiaId, profesionalId);
    const actual = await generar(barberiaId, profesionalId);
    await aceptar(vieja.token).expect(410);
    await request(app.getHttpServer())
      .delete(`/barberias/${barberiaId}/equipo/invitaciones/${actual.id}`)
      .auth(ajeno, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/barberias/${barberiaId}/equipo/invitaciones/${actual.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(204);
    await aceptar(actual.token).expect(410);
    const vencida = await generar(barberiaId, profesionalId);
    await prisma.invitacionEquipo.update({
      where: { id: vencida.id },
      data: { venceEn: new Date(0) },
    });
    await aceptar(vencida.token).expect(410);
    expect(
      await prisma.miembroBarberia.count({
        where: { usuarioId: usuarioInvitado, barberiaId },
      }),
    ).toBe(0);
  });

  it('no reemplaza membresías existentes ni reactiva accesos deshabilitados', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const i = await generar(barberiaId, profesionalId);
    await prisma.miembroBarberia.create({
      data: {
        barberiaId,
        usuarioId: usuarioInvitado,
        rol: 'ADMINISTRADOR',
        activo: false,
      },
    });
    await aceptar(i.token).expect(409);
    const m = await prisma.miembroBarberia.findUniqueOrThrow({
      where: {
        usuarioId_barberiaId: { usuarioId: usuarioInvitado, barberiaId },
      },
    });
    expect(m).toMatchObject({
      rol: 'ADMINISTRADOR',
      activo: false,
      profesionalId: null,
    });
    const invitacion = await prisma.invitacionEquipo.findUniqueOrThrow({
      where: { id: i.id },
    });
    expect(invitacion.aceptadaEn).toBeNull();
  });

  it('consume una sola vez incluso con dos aceptaciones simultáneas', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const i = await generar(barberiaId, profesionalId);
    const resultados = await Promise.all([aceptar(i.token), aceptar(i.token)]);
    expect(resultados.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 410,
    ]);
    expect(
      await prisma.miembroBarberia.count({
        where: { barberiaId, profesionalId },
      }),
    ).toBe(1);
  });

  it('no permite aceptar si el profesional o el administrador dejaron de estar activos', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const i = await generar(barberiaId, profesionalId);
    await prisma.profesional.update({
      where: { id: profesionalId },
      data: { activo: false },
    });
    await aceptar(i.token).expect(409);
    await prisma.profesional.update({
      where: { id: profesionalId },
      data: { activo: true },
    });
    await prisma.miembroBarberia.updateMany({
      where: { barberiaId, rol: 'ADMINISTRADOR' },
      data: { activo: false },
    });
    await aceptar(i.token).expect(403);
    expect(
      await prisma.miembroBarberia.count({
        where: { usuarioId: usuarioInvitado, barberiaId },
      }),
    ).toBe(0);
  });

  it('limita la agenda del miembro a su profesional y mantiene la agenda completa del administrador', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const otro = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Otro profesional' },
    });
    const servicio = await prisma.servicio.create({
      data: { barberiaId, nombre: 'Corte', precio: 10000, duracionMinutos: 30 },
    });
    const i = await generar(barberiaId, profesionalId);
    await aceptar(i.token).expect(200);
    for (const id of [profesionalId, otro.id])
      await prisma.reserva.create({
        data: {
          barberiaId,
          profesionalId: id,
          clienteId: usuarioInvitado,
          servicioId: servicio.id,
          inicio: new Date('2030-01-10T15:00:00Z'),
          fin: new Date('2030-01-10T15:30:00Z'),
          duracionMinutos: 30,
          precioAcordado: 10000,
          nombreServicio: 'Corte',
          zonaHoraria: 'America/Santiago',
        },
      });
    const url = `/barberias/${barberiaId}/reservas?fecha=2030-01-10`;
    const propia = await request(app.getHttpServer())
      .get(url)
      .auth(invitado, { type: 'bearer' })
      .expect(200);
    expect(propia.body.reservas).toHaveLength(1);
    expect(propia.body.reservas[0].profesional.id).toBe(profesionalId);
    const completa = await request(app.getHttpServer())
      .get(url)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(completa.body.reservas).toHaveLength(2);
    await request(app.getHttpServer())
      .get(url)
      .auth(ajeno, { type: 'bearer' })
      .expect(403);
  });
});
