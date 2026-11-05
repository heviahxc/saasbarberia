import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}