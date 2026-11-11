import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { ServiciosController } from './servicios.controller.js';
import { ServiciosService } from './servicios.service.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ServiciosController],
  providers: [ServiciosService],
})
export class ServiciosModule {}
