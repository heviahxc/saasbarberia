import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { MiembroBarberiaGuard } from './guards/miembro-barberia.guard.js';
import { AdministradorBarberiaGuard } from './guards/administrador-barberia.guard.js';
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: 900,
        },
        verifyOptions: {
          algorithms: ['HS256'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    MiembroBarberiaGuard,
    AdministradorBarberiaGuard,
  ],
   exports: [
    JwtModule,
    JwtAuthGuard,
    MiembroBarberiaGuard,
    AdministradorBarberiaGuard,
  ],
})
export class AuthModule {}