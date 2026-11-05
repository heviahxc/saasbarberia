import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistroDto } from './dto/registro.dto.js';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}
        
  //Registra un nuevo usuario en la base de datos
  async registro(registroDto: RegistroDto) {
    const passwordHash = await argon2.hash(
      registroDto.password,
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    try {
      return await this.prisma.usuario.create({
        data: {
          nombre: registroDto.nombre.trim(),
          email: registroDto.email,
          passwordHash,
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          creadoEn: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una cuenta con ese correo',
        );
      }

      throw error;
    }
  }
    //Inicia sesión y devuelve un token JWT si las credenciales son válidas
    async login(loginDto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        email: loginDto.email,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        passwordHash: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await argon2.verify(
      usuario.passwordHash,
      loginDto.password,
    );

    if (!passwordValida || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: usuario.id,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    };
  }
    //Obtiene todas las barberías a las que pertenece el usuario especificado
    async misBarberias(usuarioId: number) {
    return this.prisma.miembroBarberia.findMany({
      where: {
        usuarioId,
        activo: true,
      },
      select: {
        rol: true,
        profesionalId: true,
        barberia: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
          },
        },
      },
      orderBy: {
        barberiaId: 'asc',
      },
    });
  }
}