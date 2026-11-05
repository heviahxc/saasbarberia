
import { Module } from '@nestjs/common';

import { BarberiasController } from './barberias.controller.js';
import { BarberiasService } from './barberias.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BarberiasController],
  providers: [BarberiasService],
})
export class BarberiasModule {}
