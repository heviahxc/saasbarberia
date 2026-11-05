import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { ProfesionalesController } from './profesionales.controller.js';
import { ProfesionalesService } from './profesionales.service.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProfesionalesController],
  providers: [ProfesionalesService],
})
export class ProfesionalesModule {}
