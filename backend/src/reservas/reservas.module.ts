import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ReservasController } from './reservas.controller.js';
import { ReservasService } from './reservas.service.js';
import { MisReservasController } from './mis-reservas.controller.js';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReservasController, MisReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}