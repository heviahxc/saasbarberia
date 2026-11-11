import { EquipoModule } from './equipo/equipo.module.js';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BarberiasModule } from './barberias/barberias.module.js';
import { ProfesionalesModule } from './profesionales/profesionales.module.js';
import { ServiciosModule } from './servicios/servicios.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { ReservasModule } from './reservas/reservas.module.js';

@Module({
  imports: [
        ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    EquipoModule,
    BarberiasModule,
    ProfesionalesModule,
    ServiciosModule,
    AuthModule,
    CatalogoModule,
    ReservasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
