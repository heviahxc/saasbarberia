import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  EquipoController,
  InvitacionesController,
} from './equipo.controller.js';
import { EquipoService } from './equipo.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [EquipoController, InvitacionesController],
  providers: [EquipoService],
})
export class EquipoModule {}
