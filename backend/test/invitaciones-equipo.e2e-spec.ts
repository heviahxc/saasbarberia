import 'reflect-metadata';
import { randomUUID, createHash } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { DateTime } from 'luxon';
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
    const email = `${prefijo.slice(0, 20)}-${marca}@example.com`;
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
          await tx.reagendamientoReserva.deleteMany({
            where: { reserva: { barberiaId: { in: negocios } } },
          });
          await tx.horarioProfesional.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.profesionalServicio.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
                    await tx.cancelacionReserva.deleteMany({
            where: {
              reserva: {
                barberiaId: { in: negocios },
              },
            },
          });
          await tx.reserva.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.miembroBarberia.deleteMany({
            where: { barberiaId: { in: negocios } },
          });
          await tx.bloqueoProfesional.deleteMany({
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
    // El filtro del profesional se deriva de la membresía, nunca del navegador.
    await request(app.getHttpServer())
      .get(`${url}&profesionalId=${otro.id}`)
      .auth(invitado, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer()).get(url).expect(401);
    const vacia = await request(app.getHttpServer())
      .get(`/barberias/${barberiaId}/reservas?fecha=2030-01-11`)
      .auth(invitado, { type: 'bearer' })
      .expect(200);
    expect(vacia.body.reservas).toEqual([]);
    expect(propia.body.zonaHoraria).toBe('America/Santiago');
    await prisma.miembroBarberia.update({
      where: {
        usuarioId_barberiaId: { usuarioId: usuarioInvitado, barberiaId },
      },
      data: { profesionalId: null },
    });
    const sinProfesional = await request(app.getHttpServer())
      .get(url)
      .auth(invitado, { type: 'bearer' })
      .expect(200);
    expect(sinProfesional.body.reservas).toEqual([]);
    await prisma.miembroBarberia.update({
      where: {
        usuarioId_barberiaId: { usuarioId: usuarioInvitado, barberiaId },
      },
      data: { profesionalId, activo: false },
    });
    await request(app.getHttpServer())
      .get(url)
      .auth(invitado, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .get(url)
      .auth(ajeno, { type: 'bearer' })
      .expect(403);
  });
  it('permite bloqueos propios en hora local, protege otros profesionales y rechaza cruces con reservas', async () => {
    const { barberiaId, profesionalId } = await preparar();
    const i = await generar(barberiaId, profesionalId);
    await aceptar(i.token).expect(200);
    const otro = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Compañero' },
    });
    const url = `/barberias/${barberiaId}/profesionales/${profesionalId}/bloqueos`;
    const ajena = `/barberias/${barberiaId}/profesionales/${otro.id}/bloqueos`;
    const datos = {
      inicioLocal: '2030-01-10T10:00',
      finLocal: '2030-01-10T11:00',
      motivo: 'Descanso',
    };
    await request(app.getHttpServer())
      .post(url + '/local')
      .send(datos)
      .expect(401);
    await request(app.getHttpServer())
      .post(url + '/local')
      .auth(ajeno, { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(app.getHttpServer())
      .post(ajena + '/local')
      .auth(invitado, { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(app.getHttpServer())
      .get(ajena)
      .auth(invitado, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(url + '/local')
      .auth(invitado, { type: 'bearer' })
      .send({ ...datos, finLocal: datos.inicioLocal })
      .expect(400);
    await request(app.getHttpServer())
      .post(url + '/local')
      .auth(invitado, { type: 'bearer' })
      .send({ ...datos, inicioLocal: '2030-02-30T10:00' })
      .expect(400);
    const creado = await request(app.getHttpServer())
      .post(url + '/local')
      .auth(invitado, { type: 'bearer' })
      .send(datos)
      .expect(201);
    expect(creado.body.inicio).toBe('2030-01-10T13:00:00.000Z');
    const listado = await request(app.getHttpServer())
      .get(url)
      .auth(invitado, { type: 'bearer' })
      .expect(200);
    expect(listado.body.map((b: { id: number }) => b.id)).toContain(
      creado.body.id,
    );
    await request(app.getHttpServer())
      .delete(`${ajena}/${creado.body.id}`)
      .auth(invitado, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`${ajena}/${creado.body.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(404);
    const servicio = await prisma.servicio.create({
      data: { barberiaId, nombre: 'Corte', precio: 10000, duracionMinutos: 30 },
    });
    const reserva = await prisma.reserva.create({
      data: {
        barberiaId,
        profesionalId,
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
    await request(app.getHttpServer())
      .post(url + '/local')
      .auth(invitado, { type: 'bearer' })
      .send({ inicioLocal: '2030-01-10T12:00', finLocal: '2030-01-10T13:00' })
      .expect(409);
    expect(
      (await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } }))
        .estado,
    ).toBe('CONFIRMADA');
    const impacto = await request(app.getHttpServer())
      .post(url + '/impacto')
      .auth(invitado, { type: 'bearer' })
      .send({
        inicio: reserva.inicio.toISOString(),
        fin: reserva.fin.toISOString(),
      })
      .expect(200);
    expect(impacto.body.cantidadReservasAfectadas).toBe(1);
    await request(app.getHttpServer())
      .delete(`${url}/${creado.body.id}`)
      .auth(invitado, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .post(ajena + '/local')
      .auth(admin, { type: 'bearer' })
      .send(datos)
      .expect(201);
    await prisma.miembroBarberia.update({
      where: {
        usuarioId_barberiaId: { usuarioId: usuarioInvitado, barberiaId },
      },
      data: { activo: false },
    });
    await request(app.getHttpServer())
      .get(url)
      .auth(invitado, { type: 'bearer' })
      .expect(403);
  });
  it('conserva citas en un bloqueo pendiente, cierra disponibilidad y actualiza pendientes al cancelar o reagendar', async () => {
    const { barberiaId, profesionalId } = await preparar();
    await aceptar((await generar(barberiaId, profesionalId)).token).expect(200);
    const servicio = await prisma.servicio.create({
      data: { barberiaId, nombre: 'Corte', precio: 10000, duracionMinutos: 30 },
    });
    await prisma.profesionalServicio.create({
      data: { barberiaId, profesionalId, servicioId: servicio.id },
    });
    await prisma.horarioProfesional.create({
      data: {
        barberiaId,
        profesionalId,
        diaSemana: 4,
        inicioMinuto: 540,
        finMinuto: 1080,
      },
    });
    const url = `/barberias/${barberiaId}/profesionales/${profesionalId}/bloqueos`;
    const reservasUrl = `/barberias/${barberiaId}/reservas`;
    const datos = {
      inicioLocal: '2030-01-10T12:00',
      finLocal: '2030-01-10T14:00',
      motivo: 'Ausencia necesaria',
    };
    const reservar = (inicio: string) =>
      request(app.getHttpServer())
        .post(reservasUrl)
        .auth(invitado, { type: 'bearer' })
        .send({ profesionalId, servicioId: servicio.id, inicio });
    const primera = await reservar('2030-01-10T15:00:00Z').expect(201);
    const preview = await request(app.getHttpServer())
      .post(url + '/local/impacto')
      .auth(invitado, { type: 'bearer' })
      .send(datos)
      .expect(200);
    expect(preview.body.reservas.map((r: { id: number }) => r.id)).toEqual([
      primera.body.id,
    ]);
    // Una cita que entra después de la consulta también debe conservarse y aparecer pendiente.
    const segunda = await reservar('2030-01-10T15:30:00Z').expect(201);
    await request(app.getHttpServer())
      .post(url + '/local/pendiente')
      .send(datos)
      .expect(401);
    await request(app.getHttpServer())
      .post(url + '/local/pendiente')
      .auth(ajeno, { type: 'bearer' })
      .send(datos)
      .expect(403);
    const otro = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Otro' },
    });
    for (const accion of ['impacto', 'pendiente']) {
      await request(app.getHttpServer())
        .post(
          `/barberias/${barberiaId}/profesionales/${otro.id}/bloqueos/local/${accion}`,
        )
        .auth(invitado, { type: 'bearer' })
        .send(datos)
        .expect(403);
    }
    const bloqueo = await request(app.getHttpServer())
      .post(url + '/local/pendiente')
      .auth(invitado, { type: 'bearer' })
      .send(datos)
      .expect(201);
    const listar = () =>
      request(app.getHttpServer())
        .get(url)
        .auth(invitado, { type: 'bearer' })
        .expect(200);
    const pendientes = (await listar()).body[0];
    expect(pendientes.estado).toBe('PENDIENTE_RESOLUCION');
    expect(
      pendientes.reservasPendientes.map((r: { id: number }) => r.id),
    ).toEqual([primera.body.id, segunda.body.id]);
    expect(
      await prisma.reserva.count({
        where: { barberiaId, estado: 'CONFIRMADA' },
      }),
    ).toBe(2);
    const rechazada = await reservar('2030-01-10T16:00:00Z').expect(409);
    expect(rechazada.body.message).toContain('no está disponible');
    const disponibilidad = await request(app.getHttpServer())
      .get(
        `${reservasUrl}/disponibilidad?fecha=2030-01-10&profesionalId=${profesionalId}&servicioId=${servicio.id}`,
      )
      .auth(invitado, { type: 'bearer' })
      .expect(200);
    expect(
      disponibilidad.body.opciones.some(
        (o: { inicio: string; fin: string }) =>
          Date.parse(o.inicio) < Date.parse('2030-01-10T17:00:00Z') &&
          Date.parse(o.fin) > Date.parse('2030-01-10T15:00:00Z'),
      ),
    ).toBe(false);
    await request(app.getHttpServer())
      .patch(`/reservas/${primera.body.id}/reagendar`)
      .auth(invitado, { type: 'bearer' })
      .send({ inicio: '2030-01-10T16:00:00Z' })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/reservas/${primera.body.id}/cancelar`)
      .auth(invitado, { type: 'bearer' })
      .expect(200);
    expect(
      (await listar()).body[0].reservasPendientes.map(
        (r: { id: number }) => r.id,
      ),
    ).toEqual([segunda.body.id]);
    await request(app.getHttpServer())
      .patch(`/reservas/${segunda.body.id}/reagendar`)
      .auth(invitado, { type: 'bearer' })
      .send({ inicio: '2030-01-10T17:00:00Z' })
      .expect(200);
    expect((await listar()).body[0]).toMatchObject({
      estado: 'SIN_PENDIENTES',
      reservasPendientes: [],
    });
    await reservar('2030-01-10T16:00:00Z').expect(409);
    await request(app.getHttpServer())
      .delete(`${url}/${bloqueo.body.id}`)
      .auth(invitado, { type: 'bearer' })
      .expect(204);
    await reservar('2030-01-10T16:00:00Z').expect(201);
  });
    it.each(['administrador', 'profesional'] as const)(
    'permite gestionar citas al %s y rechaza cuentas sin permiso',
    async (tipoActor) => {
      const { barberiaId, profesionalId } = await preparar();

      await aceptar(
        (await generar(barberiaId, profesionalId)).token,
      ).expect(200);

      // El cliente es otra persona: así comprobamos que el historial
      // registra al miembro del equipo, no al dueño de la reserva.
      const cliente = await registrar(`cliente-gestion-${tipoActor}`);
      const companero = await registrar(`companero-gestion-${tipoActor}`);

      const otroProfesional = await prisma.profesional.create({
        data: {
          barberiaId,
          nombre: 'Otro profesional',
        },
      });

      await prisma.miembroBarberia.create({
        data: {
          barberiaId,
          usuarioId: companero.id,
          profesionalId: otroProfesional.id,
          rol: 'MIEMBRO',
        },
      });

      // La cuenta ajena sí es administradora, pero de otro negocio.
      const otroNegocio = await request(app.getHttpServer())
        .post('/barberias')
        .auth(ajeno, { type: 'bearer' })
        .send({
          nombre: `Negocio ajeno ${tipoActor}`,
          ciudad: 'Linares',
          direccion: 'Otra calle 123',
        })
        .expect(201);

      negocios.push(otroNegocio.body.id);

      const membresiaAdmin = await prisma.miembroBarberia.findFirstOrThrow({
        where: {
          barberiaId,
          rol: 'ADMINISTRADOR',
          activo: true,
        },
      });

      const tokenActor =
        tipoActor === 'administrador' ? admin : invitado;

      const actorId =
        tipoActor === 'administrador'
          ? membresiaAdmin.usuarioId
          : usuarioInvitado;

      const servicio = await prisma.servicio.create({
        data: {
          barberiaId,
          nombre: 'Corte de prueba',
          duracionMinutos: 30,
          precio: 12000,
        },
      });

      await prisma.profesionalServicio.create({
        data: {
          barberiaId,
          profesionalId,
          servicioId: servicio.id,
        },
      });

      const dia = DateTime.now()
        .setZone('America/Santiago')
        .plus({ days: 7 })
        .startOf('day');

      const fecha = dia.toISODate()!;
      const inicioOriginal = dia.set({ hour: 10 }).toUTC().toISO()!;
      const nuevoInicio = dia.set({ hour: 11 }).toUTC().toISO()!;

      await prisma.horarioProfesional.create({
        data: {
          barberiaId,
          profesionalId,
          diaSemana: dia.weekday,
          inicioMinuto: 9 * 60,
          finMinuto: 18 * 60,
        },
      });

      const creada = await request(app.getHttpServer())
        .post(`/barberias/${barberiaId}/reservas`)
        .auth(cliente.token, { type: 'bearer' })
        .send({
          profesionalId,
          servicioId: servicio.id,
          inicio: inicioOriginal,
        })
        .expect(201);

      const reservaId = creada.body.id as number;
      const ruta = `/barberias/${barberiaId}/reservas/${reservaId}`;

      const original = await prisma.reserva.findUniqueOrThrow({
        where: { id: reservaId },
      });

      const cambio = {
        inicio: nuevoInicio,
        motivo: 'Cambio coordinado con el cliente',
      };

      const cancelacion = {
        motivo: 'Cancelación coordinada con el cliente',
      };

      // Sin sesión: las tres operaciones deben estar protegidas.
      await request(app.getHttpServer())
        .get(`${ruta}/disponibilidad?fecha=${fecha}`)
        .expect(401);

      await request(app.getHttpServer())
        .patch(`${ruta}/reagendar`)
        .send(cambio)
        .expect(401);

      await request(app.getHttpServer())
        .patch(`${ruta}/cancelar`)
        .send(cancelacion)
        .expect(401);

      // Ni un compañero, ni otro administrador, ni el cliente
      // pueden usar estas rutas del equipo sobre esta reserva.
      for (const token of [companero.token, ajeno, cliente.token]) {
        await request(app.getHttpServer())
          .get(`${ruta}/disponibilidad?fecha=${fecha}`)
          .auth(token, { type: 'bearer' })
          .expect(403);

        await request(app.getHttpServer())
          .patch(`${ruta}/reagendar`)
          .auth(token, { type: 'bearer' })
          .send(cambio)
          .expect(403);

        await request(app.getHttpServer())
          .patch(`${ruta}/cancelar`)
          .auth(token, { type: 'bearer' })
          .send(cancelacion)
          .expect(403);
      }

      // Los intentos rechazados no deben modificar ni auditar la cita.
      const sinCambios = await prisma.reserva.findUniqueOrThrow({
        where: { id: reservaId },
      });

      expect(sinCambios.inicio).toEqual(original.inicio);
      expect(sinCambios.fin).toEqual(original.fin);
      expect(sinCambios.estado).toBe('CONFIRMADA');

      expect(
        await prisma.reagendamientoReserva.count({
          where: { reservaId },
        }),
      ).toBe(0);

      expect(
        await prisma.cancelacionReserva.count({
          where: { reservaId },
        }),
      ).toBe(0);

      // El actor autorizado tampoco puede enviar un motivo vacío.
      await request(app.getHttpServer())
        .patch(`${ruta}/reagendar`)
        .auth(tokenActor, { type: 'bearer' })
        .send({ ...cambio, motivo: '   ' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`${ruta}/cancelar`)
        .auth(tokenActor, { type: 'bearer' })
        .send({ motivo: '   ' })
        .expect(400);

      // Cambiamos el catálogo para verificar que la reserva conserva
      // su precio y duración originales al reagendar.
      await prisma.servicio.update({
        where: { id: servicio.id },
        data: {
          precio: 25000,
          duracionMinutos: 60,
        },
      });

      const disponibilidad = await request(app.getHttpServer())
        .get(`${ruta}/disponibilidad?fecha=${fecha}`)
        .auth(tokenActor, { type: 'bearer' })
        .expect(200);

      expect(disponibilidad.body.duracionMinutos).toBe(30);

      expect(
        disponibilidad.body.opciones.some(
          (opcion: { inicio: string }) =>
            Date.parse(opcion.inicio) === Date.parse(nuevoInicio),
        ),
      ).toBe(true);

      await request(app.getHttpServer())
        .patch(`${ruta}/reagendar`)
        .auth(tokenActor, { type: 'bearer' })
        .send(cambio)
        .expect(200);

      const reagendada = await prisma.reserva.findUniqueOrThrow({
        where: { id: reservaId },
      });

      expect(reagendada.inicio.toISOString()).toBe(nuevoInicio);
      expect(reagendada.fin.getTime() - reagendada.inicio.getTime())
        .toBe(30 * 60 * 1000);
      expect(reagendada.duracionMinutos).toBe(30);
      expect(reagendada.precioAcordado.toString()).toBe('12000');
      expect(reagendada.profesionalId).toBe(profesionalId);
      expect(reagendada.servicioId).toBe(servicio.id);
      expect(reagendada.estado).toBe('CONFIRMADA');

      const historial = await prisma.reagendamientoReserva.findMany({
        where: { reservaId },
      });

      expect(historial).toHaveLength(1);
      expect(historial[0]).toMatchObject({
        actorId,
        motivo: cambio.motivo,
        inicioAnterior: original.inicio,
        finAnterior: original.fin,
        inicioNuevo: reagendada.inicio,
        finNuevo: reagendada.fin,
      });

      // El mismo actor puede cancelar y queda registrada su identidad.
      await request(app.getHttpServer())
        .patch(`${ruta}/cancelar`)
        .auth(tokenActor, { type: 'bearer' })
        .send(cancelacion)
        .expect(200);

      const cancelada = await prisma.reserva.findUniqueOrThrow({
        where: { id: reservaId },
      });

      expect(cancelada.estado).toBe('CANCELADA');
      expect(cancelada.canceladoEn).not.toBeNull();

      const registro = await prisma.cancelacionReserva.findUniqueOrThrow({
        where: { reservaId },
      });

      expect(registro.actorId).toBe(actorId);
      expect(registro.motivo).toBe(cancelacion.motivo);

      // Repetir la cancelación no debe generar un segundo registro.
      await request(app.getHttpServer())
        .patch(`${ruta}/cancelar`)
        .auth(tokenActor, { type: 'bearer' })
        .send(cancelacion)
        .expect(409);

      expect(
        await prisma.cancelacionReserva.count({
          where: { reservaId },
        }),
      ).toBe(1);
    },
  );
});
