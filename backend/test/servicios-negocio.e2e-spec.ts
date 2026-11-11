import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Gestión de servicios del negocio', () => {
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
  let otroServicioId: number;
  const datos = {
    nombre: 'Corte clásico',
    duracionMinutos: 30,
    precio: '15000',
  };

  const servidor = () => app.getHttpServer();
  const url = () => `/barberias/${barberiaId}/servicios`;
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
    otroServicioId = (
      await prisma.servicio.create({
        data: { ...datos, barberiaId: otraBarberiaId },
      })
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

  it('crea, normaliza y edita el servicio completo conservando los decimales', async () => {
    const creada = await request(servidor())
      .post(url())
      .auth(admin, { type: 'bearer' })
      .send({ ...datos, nombre: '  Corte   premium  ', precio: '12345.67' })
      .expect(201);
    expect(creada.body).toMatchObject({
      nombre: 'Corte premium',
      activo: true,
      precio: '12345.67',
      barberiaId,
    });
    const cambio = await request(servidor())
      .patch(`${url()}/${creada.body.id}`)
      .auth(admin, { type: 'bearer' })
      .send({
        nombre: '  Alisado   completo ',
        duracionMinutos: 120,
        precio: '45000.50',
      })
      .expect(200);
    expect(cambio.body).toMatchObject({
      nombre: 'Alisado completo',
      duracionMinutos: 120,
      precio: '45000.5',
      activo: true,
      barberiaId,
    });
    const lista = await request(servidor())
      .get(url())
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(lista.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: creada.body.id,
          nombre: 'Alisado completo',
        }),
      ]),
    );
  });

  it('rechaza escrituras sin token y de miembros sin rol administrador', async () => {
    await request(servidor()).post(url()).send(datos).expect(401);
    await request(servidor())
      .patch(`${url()}/${servicioId}`)
      .send(datos)
      .expect(401);
    await request(servidor())
      .post(url())
      .auth(miembro, { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(servidor())
      .patch(`${url()}/${servicioId}`)
      .auth(miembro, { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(servidor())
      .patch(`${url()}/${servicioId}/estado`)
      .auth(miembro, { type: 'bearer' })
      .send({ activo: false })
      .expect(403);
  });

  it('impide modificar un servicio de otro negocio incluso intercambiando su ID', async () => {
    await request(servidor())
      .patch(`${url()}/${servicioId}`)
      .auth(otroAdmin, { type: 'bearer' })
      .send(datos)
      .expect(403);
    await request(servidor())
      .patch(`${url()}/${otroServicioId}`)
      .auth(admin, { type: 'bearer' })
      .send({ ...datos, nombre: 'Intento ajeno' })
      .expect(404);
    await request(servidor())
      .patch(`${url()}/${otroServicioId}/estado`)
      .auth(admin, { type: 'bearer' })
      .send({ activo: false })
      .expect(404);
    const otro = await prisma.servicio.findUniqueOrThrow({
      where: { id: otroServicioId },
    });
    expect(otro.nombre).toBe(datos.nombre);
    expect(otro.activo).toBe(true);
  });

  it('valida nombre, precio, duración y campos inesperados al crear y editar', async () => {
    const invalidos = [
      { ...datos, nombre: '   ' },
      { ...datos, nombre: 'x'.repeat(101) },
      { ...datos, duracionMinutos: 0 },
      { ...datos, duracionMinutos: 30.5 },
      { ...datos, duracionMinutos: 1441 },
      { ...datos, precio: '-1' },
      { ...datos, precio: '100000000' },
      { ...datos, precio: '1.001' },
      { ...datos, precio: 15000 },
      { ...datos, precio: '1e3' },
      { ...datos, barberiaId: otraBarberiaId },
      { ...datos, activo: false },
      { nombre: datos.nombre },
    ];
    const antes = await prisma.servicio.count({ where: { barberiaId } });
    for (const body of invalidos) {
      await request(servidor())
        .post(url())
        .auth(admin, { type: 'bearer' })
        .send(body)
        .expect(400);
      await request(servidor())
        .patch(`${url()}/${servicioId}`)
        .auth(admin, { type: 'bearer' })
        .send(body)
        .expect(400);
    }
    expect(await prisma.servicio.count({ where: { barberiaId } })).toBe(antes);
    expect(
      (await prisma.servicio.findUniqueOrThrow({ where: { id: servicioId } }))
        .nombre,
    ).toBe(datos.nombre);
    await request(servidor())
      .patch(`${url()}/2147483648`)
      .auth(admin, { type: 'bearer' })
      .send(datos)
      .expect(400);
  });

  it('desactiva y reactiva en el catálogo sin borrar el servicio ni reactivarlo al editar', async () => {
    await request(servidor())
      .patch(`${url()}/${servicioId}/estado`)
      .auth(admin, { type: 'bearer' })
      .send({ activo: false })
      .expect(200);
    const catalogo = await request(servidor())
      .get(`/catalogo/barberias/${barberiaId}/servicios`)
      .auth(miembro, { type: 'bearer' })
      .expect(200);
    expect(catalogo.body.some((s: { id: number }) => s.id === servicioId)).toBe(
      false,
    );
    const editado = await request(servidor())
      .patch(`${url()}/${servicioId}`)
      .auth(admin, { type: 'bearer' })
      .send(datos)
      .expect(200);
    expect(editado.body.activo).toBe(false);
    await request(servidor())
      .patch(`${url()}/${servicioId}/estado`)
      .auth(admin, { type: 'bearer' })
      .send({ activo: true })
      .expect(200);
    const activo = await request(servidor())
      .get(`/catalogo/barberias/${barberiaId}/servicios`)
      .auth(miembro, { type: 'bearer' })
      .expect(200);
    expect(activo.body.some((s: { id: number }) => s.id === servicioId)).toBe(
      true,
    );
  });

  it('conserva el precio, nombre, duración y horario acordados en las reservas existentes', async () => {
    const profesional = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Profesional de prueba' },
    });
    const reserva = await prisma.reserva.create({
      data: {
        barberiaId,
        profesionalId: profesional.id,
        servicioId,
        clienteId: miembroId,
        inicio: new Date('2030-02-10T15:00:00Z'),
        fin: new Date('2030-02-10T15:30:00Z'),
        duracionMinutos: 30,
        precioAcordado: '15000',
        nombreServicio: datos.nombre,
        zonaHoraria: 'America/Santiago',
      },
    });
    await request(servidor())
      .patch(`${url()}/${servicioId}`)
      .auth(admin, { type: 'bearer' })
      .send({ nombre: 'Nuevo nombre', duracionMinutos: 120, precio: '45000' })
      .expect(200);
    await request(servidor())
      .patch(`${url()}/${servicioId}/estado`)
      .auth(admin, { type: 'bearer' })
      .send({ activo: false })
      .expect(200);
    const despues = await prisma.reserva.findUniqueOrThrow({
      where: { id: reserva.id },
    });
    expect(despues).toEqual(reserva);
  });

  it('asigna, evita duplicados y quita el vínculo conservando el servicio y sus reservas', async () => {
    const profesional = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Profesional asignaciones' },
    });
    const servicio = await prisma.servicio.create({
      data: { ...datos, barberiaId },
    });
    const ruta = `/barberias/${barberiaId}/profesionales/${profesional.id}/servicios`;
    await request(servidor())
      .post(ruta)
      .auth(admin, { type: 'bearer' })
      .send({ servicioId: servicio.id })
      .expect(201);
    await request(servidor())
      .post(ruta)
      .auth(admin, { type: 'bearer' })
      .send({ servicioId: servicio.id })
      .expect(409);
    const lista = await request(servidor())
      .get(ruta)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(lista.body.map((s: { id: number }) => s.id)).toEqual([servicio.id]);
    const reserva = await prisma.reserva.create({
      data: {
        barberiaId,
        profesionalId: profesional.id,
        servicioId: servicio.id,
        clienteId: miembroId,
        inicio: new Date('2030-02-11T15:00:00Z'),
        fin: new Date('2030-02-11T15:30:00Z'),
        duracionMinutos: 30,
        precioAcordado: '15000',
        nombreServicio: datos.nombre,
        zonaHoraria: 'America/Santiago',
      },
    });
    await prisma.servicio.update({
      where: { id: servicio.id },
      data: { activo: false },
    });
    const inactivo = await request(servidor())
      .get(ruta)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(inactivo.body[0].activo).toBe(false);
    await request(servidor())
      .delete(`${ruta}/${servicio.id}`)
      .auth(admin, { type: 'bearer' })
      .expect(204);
    const vacia = await request(servidor())
      .get(ruta)
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(vacia.body).toEqual([]);
    expect(
      await prisma.reserva.findUniqueOrThrow({ where: { id: reserva.id } }),
    ).toEqual(reserva);
    expect(
      await prisma.servicio.findUnique({ where: { id: servicio.id } }),
    ).not.toBeNull();
    await request(servidor())
      .post(ruta)
      .auth(admin, { type: 'bearer' })
      .send({ servicioId: servicio.id })
      .expect(409);
  });

  it('protege las asignaciones contra miembros, cuentas ajenas e IDs de otros negocios', async () => {
    const profesional = await prisma.profesional.create({
      data: { barberiaId, nombre: 'Profesional permisos' },
    });
    const ajeno = await prisma.profesional.create({
      data: { barberiaId: otraBarberiaId, nombre: 'Profesional ajeno' },
    });
    const servicio = await prisma.servicio.create({
      data: { ...datos, barberiaId },
    });
    const ruta = `/barberias/${barberiaId}/profesionales/${profesional.id}/servicios`;
    await request(servidor())
      .post(ruta)
      .send({ servicioId: servicio.id })
      .expect(401);
    for (const cuenta of [miembro, otroAdmin]) {
      await request(servidor())
        .post(ruta)
        .auth(cuenta, { type: 'bearer' })
        .send({ servicioId: servicio.id })
        .expect(403);
      await request(servidor())
        .delete(`${ruta}/${servicio.id}`)
        .auth(cuenta, { type: 'bearer' })
        .expect(403);
    }
    await request(servidor())
      .post(ruta)
      .auth(admin, { type: 'bearer' })
      .send({ servicioId: otroServicioId })
      .expect(404);
    await request(servidor())
      .post(`/barberias/${barberiaId}/profesionales/${ajeno.id}/servicios`)
      .auth(admin, { type: 'bearer' })
      .send({ servicioId: servicio.id })
      .expect(404);
    await prisma.profesionalServicio.create({
      data: {
        barberiaId: otraBarberiaId,
        profesionalId: ajeno.id,
        servicioId: otroServicioId,
      },
    });
    await request(servidor())
      .delete(
        `/barberias/${barberiaId}/profesionales/${ajeno.id}/servicios/${otroServicioId}`,
      )
      .auth(admin, { type: 'bearer' })
      .expect(404);
    expect(
      await prisma.profesionalServicio.count({
        where: {
          barberiaId: otraBarberiaId,
          profesionalId: ajeno.id,
          servicioId: otroServicioId,
        },
      }),
    ).toBe(1);
  });
});
