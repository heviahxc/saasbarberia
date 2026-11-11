import 'reflect-metadata';
import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Permisos entre barberías', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let baseVerificada = false;

  let tokenA: string;
  let tokenB: string;
  let barberiaA: number;
  let barberiaB: number;

  const identificador = randomUUID();
  const emailA = `admin-a-${identificador}@example.com`;
  const emailB = `admin-b-${identificador}@example.com`;
  const nombreA = `E2E A ${identificador}`;
  const nombreB = `E2E B ${identificador}`;
  const password = 'Prueba-integracion-2026!';

  async function registrarEIngresar(email: string) {
    const registro = await request(app!.getHttpServer())
      .post('/auth/registro')
      .send({
  nombre: 'Usuario de prueba',
  apellidoPaterno: 'Torres',
  apellidoMaterno: null,
  telefono: '+56912345678',
  email,
  password,
})
      .expect(201);

    expect(registro.body).not.toHaveProperty('password');
    expect(registro.body).not.toHaveProperty('passwordHash');

    const login = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(login.body.accessToken).toEqual(expect.any(String));

    return login.body.accessToken as string;
  }

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    // Verificar la conexión real antes de escribir registros.
    const conexiones = await prisma.$queryRaw<
      { base: string; esquema: string; zona: string }[]
    >`
      SELECT
        current_database() AS base,
        current_schema() AS esquema,
        current_setting('TimeZone') AS zona
    `;

    expect(conexiones[0].base).toBe('barber_saas_test');
    expect(conexiones[0].esquema).toBe('public');
    expect(conexiones[0].zona).toBe('UTC');

    baseVerificada = true;

    tokenA = await registrarEIngresar(emailA);
    tokenB = await registrarEIngresar(emailB);

    const respuestaA = await request(app.getHttpServer())
      .post('/barberias')
      .auth(tokenA, { type: 'bearer' })
      .send({
        nombre: nombreA,
        direccion: '  Avenida   Central 123  ',
        ciudad: 'Ciudad de prueba',
      })
      .expect(201);

    barberiaA = respuestaA.body.id;

    const respuestaB = await request(app.getHttpServer())
      .post('/barberias')
      .auth(tokenB, { type: 'bearer' })
      .send({
        nombre: nombreB,
        ciudad: 'Ciudad de prueba',
      })
      .expect(201);

    barberiaB = respuestaB.body.id;
  });


  afterAll(async () => {
    try {
      if (baseVerificada) {
        // Limpiar exclusivamente los registros de esta ejecución.
        await prisma.$transaction(async (tx) => {
          const negocios = await tx.barberia.findMany({
            where: {
              nombre: { in: [nombreA, nombreB] },
            },
            select: { id: true },
          });

          const ids = negocios.map((negocio) => negocio.id);
                    await tx.reagendamientoReserva.deleteMany({
            where: {
              reserva: {
                barberiaId: { in: ids },
              },
            },
          });
                    await tx.reserva.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });

          await tx.profesionalServicio.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });

          await tx.horarioProfesional.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });

          await tx.servicio.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });
                    await tx.bloqueoProfesional.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });
          await tx.profesional.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });
          await tx.miembroBarberia.deleteMany({
            where: {
              barberiaId: { in: ids },
            },
          });

          await tx.barberia.deleteMany({
            where: {
              id: { in: ids },
            },
          });

          await tx.usuario.deleteMany({
            where: {
              email: { in: [emailA, emailB] },
            },
          });
        });
      }
    } finally {
      await app?.close();
    }

    
  });

  it('guarda la dirección y asigna al creador como administrador', async () => {
    const negocio = await request(app!.getHttpServer())
      .get(`/barberias/${barberiaA}`).auth(tokenA, { type: 'bearer' }).expect(200);
    expect(negocio.body.direccion).toBe('Avenida Central 123');
    const membresias = await request(app!.getHttpServer())
      .get('/auth/me/barberias').auth(tokenA, { type: 'bearer' }).expect(200);
    expect(membresias.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ rol: 'ADMINISTRADOR', barberia: expect.objectContaining({ id: barberiaA }) }),
    ]));
  });

  it('rechaza creación anónima, datos vacíos y roles enviados por el cliente', async () => {
    const datos = { nombre: nombreA, ciudad: 'Linares', direccion: 'Central 123' };
    await request(app!.getHttpServer()).post('/barberias').send(datos).expect(401);
    for (const body of [{ ...datos, nombre: '   ' }, { ...datos, direccion: '   ' }, { ...datos, rol: 'ADMINISTRADOR' }]) {
      await request(app!.getHttpServer()).post('/barberias')
        .auth(tokenA, { type: 'bearer' }).send(body).expect(400);
    }
  });

  it('rechaza una consulta sin token', async () => {
    await request(app!.getHttpServer())
      .get(`/barberias/${barberiaA}/profesionales`)
      .expect(401);
  });

  it('permite a cada administrador consultar su negocio', async () => {
    const respuestaA = await request(app!.getHttpServer())
      .get(`/barberias/${barberiaA}/profesionales`)
      .auth(tokenA, { type: 'bearer' })
      .expect(200);

    const respuestaB = await request(app!.getHttpServer())
      .get(`/barberias/${barberiaB}/profesionales`)
      .auth(tokenB, { type: 'bearer' })
      .expect(200);

    expect(respuestaA.body).toEqual([]);
    expect(respuestaB.body).toEqual([]);
  });

  it('rechaza el acceso al negocio de la otra cuenta', async () => {
    await request(app!.getHttpServer())
      .get(`/barberias/${barberiaB}/profesionales`)
      .auth(tokenA, { type: 'bearer' })
      .expect(403);

    await request(app!.getHttpServer())
      .get(`/barberias/${barberiaA}/profesionales`)
      .auth(tokenB, { type: 'bearer' })
      .expect(403);
  });

  it('lista únicamente las barberías de la cuenta autenticada', async () => {
    const respuesta = await request(app!.getHttpServer())
      .get('/barberias')
      .auth(tokenA, { type: 'bearer' })
      .expect(200);

    expect(
      respuesta.body.map((barberia: { id: number }) => barberia.id),
    ).toEqual([barberiaA]);
  });

    it('protege el ciclo de reserva, cancelación y reagendamiento', async () => {
    const servidor = app!.getHttpServer();

    // Preparar un profesional.
    const respuestaProfesional = await request(servidor)
      .post(`/barberias/${barberiaA}/profesionales`)
      .auth(tokenA, { type: 'bearer' })
      .send({
        nombre: 'Profesional de concurrencia',
      })
      .expect(201);

    const profesionalId = respuestaProfesional.body.id;

    // Preparar un servicio.
    const respuestaServicio = await request(servidor)
      .post(`/barberias/${barberiaA}/servicios`)
      .auth(tokenA, { type: 'bearer' })
      .send({
        nombre: 'Corte de prueba',
        duracionMinutos: 30,
        precio: '12000',
      })
      .expect(201);

    const servicioId = respuestaServicio.body.id;

    // Asignar el servicio.
    await request(servidor)
      .post(
        `/barberias/${barberiaA}/profesionales/${profesionalId}/servicios`,
      )
      .auth(tokenA, { type: 'bearer' })
      .send({ servicioId })
      .expect(201);

    // Lunes de 09:00 a 13:00.
    const respuestaHorario = await request(servidor)
      .post(
        `/barberias/${barberiaA}/profesionales/${profesionalId}/horarios`,
      )
      .auth(tokenA, { type: 'bearer' })
      .send({
        diaSemana: 1,
        inicioMinuto: 540,
        finMinuto: 780,
      })
      .expect(201);

    const horarioId = respuestaHorario.body.id;

    const inicio = DateTime.now()
      .setZone('America/Santiago')
      .startOf('week')
      .plus({ weeks: 1 })
      .set({ hour: 9 });

    const inicioISO = inicio.toUTC().toISO()!;
    const finISO = inicio.plus({ minutes: 30 }).toUTC().toISO()!;

    const cuerpo = {
      profesionalId,
      servicioId,
      inicio: inicioISO,
    };

    // Ambas cuentas reservan como clientes.
    // tokenB no tiene membresía en barberiaA.
    const respuestas = await Promise.all([
      request(servidor)
        .post(`/barberias/${barberiaA}/reservas`)
        .auth(tokenA, { type: 'bearer' })
        .send(cuerpo),

      request(servidor)
        .post(`/barberias/${barberiaA}/reservas`)
        .auth(tokenB, { type: 'bearer' })
        .send(cuerpo),
    ]);

    expect(
      respuestas.map((respuesta) => respuesta.status).sort(),
    ).toEqual([201, 409]);

    const confirmada = respuestas.find(
      (respuesta) => respuesta.status === 201,
    )!;

    const rechazada = respuestas.find(
      (respuesta) => respuesta.status === 409,
    )!;

    expect(confirmada.body.estado).toBe('CONFIRMADA');
    expect(confirmada.body.inicio).toBe(inicioISO);
    expect(confirmada.body.fin).toBe(finISO);

    expect(rechazada.body.message).toBe(
      'Ese horario ya está ocupado. Elige otro horario',
    );

    // Debe existir exactamente una reserva.
    const guardadas = await prisma.reserva.findMany({
      where: {
        barberiaId: barberiaA,
        profesionalId,
      },
    });

    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].inicio.toISOString()).toBe(inicioISO);
    expect(guardadas[0].fin.toISOString()).toBe(finISO);

    // Verificar el instante almacenado sin depender
    // del lector de fechas del adaptador.
    const instantes = await prisma.$queryRaw<
      { inicioMs: number; finMs: number }[]
    >`
      SELECT
        (EXTRACT(EPOCH FROM "inicio") * 1000)::double precision
          AS "inicioMs",
        (EXTRACT(EPOCH FROM "fin") * 1000)::double precision
          AS "finMs"
      FROM "public"."Reserva"
      WHERE "id" = ${guardadas[0].id}
    `;

    expect(instantes[0].inicioMs).toBe(inicio.toMillis());
    expect(instantes[0].finMs).toBe(
      inicio.plus({ minutes: 30 }).toMillis(),
    );

    // La cita confirmada debe impedir eliminar su jornada.
    await request(servidor)
      .delete(
        `/barberias/${barberiaA}/profesionales/${profesionalId}/horarios/${horarioId}`,
      )
      .auth(tokenA, { type: 'bearer' })
      .expect(409);

    const horarioConservado =
      await prisma.horarioProfesional.findUnique({
        where: { id: horarioId },
      });

    expect(horarioConservado).not.toBeNull();

    // La disponibilidad debe excluir las opciones superpuestas.
    const disponibilidad = await request(servidor)
      .get(`/barberias/${barberiaA}/reservas/disponibilidad`)
      .auth(tokenB, { type: 'bearer' })
      .query({
        fecha: inicio.toISODate(),
        profesionalId,
        servicioId,
      })
      .expect(200);

    const horas = disponibilidad.body.opciones.map(
      (opcion: { horaLocal: string }) => opcion.horaLocal,
    );

    expect(horas).not.toContain('09:00');
    expect(horas).not.toContain('09:15');
    expect(horas).toContain('09:30');
        // Identificar quién consiguió reservar.
    const tokenPropietario =
      respuestas[0].status === 201 ? tokenA : tokenB;

    const tokenAjeno =
      respuestas[0].status === 201 ? tokenB : tokenA;

    const reservaId = confirmada.body.id;

    // Otra cuenta no puede cancelar la reserva.
    await request(servidor)
      .patch(`/reservas/${reservaId}/cancelar`)
      .auth(tokenAjeno, { type: 'bearer' })
      .expect(404);

    const despuesDelIntentoAjeno =
      await prisma.reserva.findUniqueOrThrow({
        where: { id: reservaId },
      });

    expect(despuesDelIntentoAjeno.estado).toBe('CONFIRMADA');
    expect(despuesDelIntentoAjeno.canceladoEn).toBeNull();

    // Su propietario sí puede cancelarla.
    const cancelacion = await request(servidor)
      .patch(`/reservas/${reservaId}/cancelar`)
      .auth(tokenPropietario, { type: 'bearer' })
      .expect(200);

    expect(cancelacion.body.id).toBe(reservaId);
    expect(cancelacion.body.estado).toBe('CANCELADA');
    expect(cancelacion.body.canceladoEn).toEqual(expect.any(String));

    const cancelada = await prisma.reserva.findUniqueOrThrow({
      where: { id: reservaId },
    });

    expect(cancelada.estado).toBe('CANCELADA');
    expect(cancelada.canceladoEn).not.toBeNull();
    expect(cancelada.inicio.toISOString()).toBe(inicioISO);
    expect(cancelada.fin.toISOString()).toBe(finISO);

    // Repetir la cancelación no cambia la fecha original.
    await request(servidor)
      .patch(`/reservas/${reservaId}/cancelar`)
      .auth(tokenPropietario, { type: 'bearer' })
      .expect(409);

    const trasRepetir = await prisma.reserva.findUniqueOrThrow({
      where: { id: reservaId },
    });

    expect(trasRepetir.canceladoEn?.getTime()).toBe(
      cancelada.canceladoEn?.getTime(),
    );

    // El horario vuelve a aparecer en disponibilidad.
    const disponibilidadLibre = await request(servidor)
      .get(`/barberias/${barberiaA}/reservas/disponibilidad`)
      .auth(tokenAjeno, { type: 'bearer' })
      .query({
        fecha: inicio.toISODate(),
        profesionalId,
        servicioId,
      })
      .expect(200);

    const horasLibres = disponibilidadLibre.body.opciones.map(
      (opcion: { horaLocal: string }) => opcion.horaLocal,
    );

    expect(horasLibres).toContain('09:00');
    expect(horasLibres).toContain('09:15');

    // La otra cuenta puede ocupar ahora ese mismo intervalo.
    const nuevaReserva = await request(servidor)
      .post(`/barberias/${barberiaA}/reservas`)
      .auth(tokenAjeno, { type: 'bearer' })
      .send(cuerpo)
      .expect(201);

    expect(nuevaReserva.body.id).not.toBe(reservaId);
    expect(nuevaReserva.body.estado).toBe('CONFIRMADA');
    expect(nuevaReserva.body.inicio).toBe(inicioISO);

    const reservasFinales = await prisma.reserva.findMany({
      where: {
        barberiaId: barberiaA,
        profesionalId,
      },
    });
        // nuevaReserva pertenece a tokenAjeno:
    // fue quien reservó después de la cancelación.
    const reservaReagendarId = nuevaReserva.body.id;

    const nuevoInicio = inicio
      .plus({ minutes: 15 })
      .toUTC()
      .toISO()!;

    const nuevoFin = inicio
      .plus({ minutes: 45 })
      .toUTC()
      .toISO()!;

    // Una cuenta distinta no puede modificar la cita.
    await request(servidor)
      .patch(`/reservas/${reservaReagendarId}/reagendar`)
      .auth(tokenPropietario, { type: 'bearer' })
      .send({ inicio: nuevoInicio })
      .expect(404);

    const antesDelCambio =
      await prisma.reserva.findUniqueOrThrow({
        where: { id: reservaReagendarId },
      });

    expect(antesDelCambio.inicio.toISOString()).toBe(inicioISO);

    expect(
      await prisma.reagendamientoReserva.count({
        where: { reservaId: reservaReagendarId },
      }),
    ).toBe(0);

    // Cambiar de 09:00–09:30 a 09:15–09:45.
    // La propia cita no debe considerarse un conflicto.
    const reagendada = await request(servidor)
      .patch(`/reservas/${reservaReagendarId}/reagendar`)
      .auth(tokenAjeno, { type: 'bearer' })
      .send({ inicio: nuevoInicio })
      .expect(200);

    expect(reagendada.body.id).toBe(reservaReagendarId);
    expect(reagendada.body.estado).toBe('CONFIRMADA');
    expect(reagendada.body.inicio).toBe(nuevoInicio);
    expect(reagendada.body.fin).toBe(nuevoFin);
    expect(reagendada.body.duracionMinutos).toBe(30);
    expect(reagendada.body.precioAcordado).toBe(
      nuevaReserva.body.precioAcordado,
    );

    const historial = await prisma.reagendamientoReserva.findMany({
      where: { reservaId: reservaReagendarId },
    });

    expect(historial).toHaveLength(1);
    expect(historial[0].actorId).toBe(nuevaReserva.body.clienteId);
    expect(historial[0].inicioAnterior.toISOString()).toBe(inicioISO);
    expect(historial[0].finAnterior.toISOString()).toBe(finISO);
    expect(historial[0].inicioNuevo.toISOString()).toBe(nuevoInicio);
    expect(historial[0].finNuevo.toISOString()).toBe(nuevoFin);

    // Preparar otra cita a las 10:00.
    const inicioOcupado = inicio
      .plus({ minutes: 60 })
      .toUTC()
      .toISO()!;

    await request(servidor)
      .post(`/barberias/${barberiaA}/reservas`)
      .auth(tokenPropietario, { type: 'bearer' })
      .send({
        ...cuerpo,
        inicio: inicioOcupado,
      })
      .expect(201);

    // Intentar mover la cita a ese horario ocupado.
    const conflicto = await request(servidor)
      .patch(`/reservas/${reservaReagendarId}/reagendar`)
      .auth(tokenAjeno, { type: 'bearer' })
      .send({ inicio: inicioOcupado })
      .expect(409);

    expect(conflicto.body.message).toBe(
      'El nuevo horario ya está ocupado',
    );

    // La cita debe conservar el último horario válido.
    const conservada = await prisma.reserva.findUniqueOrThrow({
      where: { id: reservaReagendarId },
    });

    expect(conservada.inicio.toISOString()).toBe(nuevoInicio);
    expect(conservada.fin.toISOString()).toBe(nuevoFin);
    expect(conservada.estado).toBe('CONFIRMADA');

    // El intento rechazado no debe agregar ni alterar historial.
    const historialFinal =
      await prisma.reagendamientoReserva.findMany({
        where: { reservaId: reservaReagendarId },
      });

    expect(historialFinal).toEqual(historial);

    // Repetir el horario actual tampoco genera otro cambio.
    await request(servidor)
      .patch(`/reservas/${reservaReagendarId}/reagendar`)
      .auth(tokenAjeno, { type: 'bearer' })
      .send({ inicio: nuevoInicio })
      .expect(400);

    expect(
      await prisma.reagendamientoReserva.count({
        where: { reservaId: reservaReagendarId },

        
      }),
    ).toBe(1);

    expect(reservasFinales).toHaveLength(2);

    expect(
      reservasFinales.filter(
        (reserva) => reserva.estado === 'CONFIRMADA',
      ),
    ).toHaveLength(1);

    expect(
      reservasFinales.filter(
        (reserva) => reserva.estado === 'CANCELADA',
      ),
    ).toHaveLength(1);

        // 1. No permitir un bloqueo sobre la cita de 09:15–09:45.
    await request(servidor)
      .post(
        `/barberias/${barberiaA}/profesionales/${profesionalId}/bloqueos`,
      )
      .auth(tokenA, { type: 'bearer' })
      .send({
        inicio: nuevoInicio,
        fin: nuevoFin,
        motivo: 'Debe rechazarse',
      })
      .expect(409);

    expect(
      await prisma.bloqueoProfesional.count({
        where: {
          barberiaId: barberiaA,
          profesionalId,
        },
      }),
    ).toBe(0);

    // 2. Preparar una ausencia de 11:00 a 12:00.
    const inicioBloqueo = inicio
      .plus({ hours: 2 })
      .toUTC()
      .toISO()!;

    const finBloqueo = inicio
      .plus({ hours: 3 })
      .toUTC()
      .toISO()!;

    const cuerpoBloqueo = {
      inicio: inicioBloqueo,
      fin: finBloqueo,
      motivo: 'Ausencia de integración',
    };

    const rutaBloqueos =
      `/barberias/${barberiaA}` +
      `/profesionales/${profesionalId}/bloqueos`;

    // tokenB no pertenece al equipo de barberiaA.
    await request(servidor)
      .post(rutaBloqueos)
      .auth(tokenB, { type: 'bearer' })
      .send(cuerpoBloqueo)
      .expect(403);

    // Su administrador sí puede crear el bloqueo.
    const bloqueoCreado = await request(servidor)
      .post(rutaBloqueos)
      .auth(tokenA, { type: 'bearer' })
      .send(cuerpoBloqueo)
      .expect(201);

    const bloqueoId = bloqueoCreado.body.id;

    expect(bloqueoCreado.body.inicio).toBe(inicioBloqueo);
    expect(bloqueoCreado.body.fin).toBe(finBloqueo);

    // 3. El bloqueo impide reservar directamente.
    const reservaDuranteBloqueo = await request(servidor)
      .post(`/barberias/${barberiaA}/reservas`)
      .auth(tokenB, { type: 'bearer' })
      .send({
        ...cuerpo,
        inicio: inicioBloqueo,
      })
      .expect(409);

    expect(reservaDuranteBloqueo.body.message).toBe(
      'El profesional no está disponible en ese intervalo',
    );

    // 4. La disponibilidad también debe respetarlo.
    const disponibilidadBloqueada = await request(servidor)
      .get(`/barberias/${barberiaA}/reservas/disponibilidad`)
      .auth(tokenB, { type: 'bearer' })
      .query({
        fecha: inicio.toISODate(),
        profesionalId,
        servicioId,
      })
      .expect(200);

    const horasConBloqueo =
      disponibilidadBloqueada.body.opciones.map(
        (opcion: { horaLocal: string }) => opcion.horaLocal,
      );

    // 10:45–11:15 también se cruza con la ausencia.
    expect(horasConBloqueo).not.toContain('10:45');
    expect(horasConBloqueo).not.toContain('11:00');
    expect(horasConBloqueo).not.toContain('11:45');

    // Puede comenzar exactamente cuando termina el bloqueo.
    expect(horasConBloqueo).toContain('12:00');

    // 5. Una cuenta ajena no puede eliminar la ausencia.
    await request(servidor)
      .delete(`${rutaBloqueos}/${bloqueoId}`)
      .auth(tokenB, { type: 'bearer' })
      .expect(403);

    expect(
      await prisma.bloqueoProfesional.findUnique({
        where: { id: bloqueoId },
      }),
    ).not.toBeNull();

    // 6. El administrador elimina el bloqueo.
    await request(servidor)
      .delete(`${rutaBloqueos}/${bloqueoId}`)
      .auth(tokenA, { type: 'bearer' })
      .expect(204);

    expect(
      await prisma.bloqueoProfesional.findUnique({
        where: { id: bloqueoId },
      }),
    ).toBeNull();

    // 7. El horario vuelve a ofrecerse.
    const disponibilidadRestaurada = await request(servidor)
      .get(`/barberias/${barberiaA}/reservas/disponibilidad`)
      .auth(tokenB, { type: 'bearer' })
      .query({
        fecha: inicio.toISODate(),
        profesionalId,
        servicioId,
      })
      .expect(200);

    const horasRestauradas =
      disponibilidadRestaurada.body.opciones.map(
        (opcion: { horaLocal: string }) => opcion.horaLocal,
      );

    expect(horasRestauradas).toContain('10:45');
    expect(horasRestauradas).toContain('11:00');
    expect(horasRestauradas).toContain('11:45');

    // Y ahora sí admite una reserva a las 11:00.
    await request(servidor)
      .post(`/barberias/${barberiaA}/reservas`)
      .auth(tokenB, { type: 'bearer' })
      .send({
        ...cuerpo,
        inicio: inicioBloqueo,
      })
      .expect(201);
  });

  
});