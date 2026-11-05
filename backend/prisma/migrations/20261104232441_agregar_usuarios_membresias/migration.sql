-- CreateEnum
CREATE TYPE "RolBarberia" AS ENUM ('ADMINISTRADOR', 'MIEMBRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiembroBarberia" (
    "usuarioId" INTEGER NOT NULL,
    "barberiaId" INTEGER NOT NULL,
    "rol" "RolBarberia" NOT NULL DEFAULT 'MIEMBRO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "profesionalId" INTEGER,

    CONSTRAINT "MiembroBarberia_pkey" PRIMARY KEY ("usuarioId","barberiaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "MiembroBarberia_barberiaId_idx" ON "MiembroBarberia"("barberiaId");
CREATE INDEX "MiembroBarberia_profesionalId_barberiaId_idx"
ON "MiembroBarberia"("profesionalId", "barberiaId");
-- AddForeignKey
ALTER TABLE "MiembroBarberia" ADD CONSTRAINT "MiembroBarberia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MiembroBarberia" ADD CONSTRAINT "MiembroBarberia_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MiembroBarberia"
ADD CONSTRAINT "MiembroBarberia_profesionalId_barberiaId_fkey"
FOREIGN KEY ("profesionalId", "barberiaId")
REFERENCES "Profesional"("id", "barberiaId")
ON DELETE RESTRICT ON UPDATE RESTRICT;