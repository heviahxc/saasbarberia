-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoReserva" ADD VALUE 'ATENDIDA';
ALTER TYPE "EstadoReserva" ADD VALUE 'NO_ASISTIO';

-- CreateTable
CREATE TABLE "CierreReserva" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "estado" "EstadoReserva" NOT NULL,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CierreReserva_reservaId_key" ON "CierreReserva"("reservaId");

-- CreateIndex
CREATE INDEX "CierreReserva_actorId_idx" ON "CierreReserva"("actorId");

-- AddForeignKey
ALTER TABLE "CierreReserva" ADD CONSTRAINT "CierreReserva_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CierreReserva" ADD CONSTRAINT "CierreReserva_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CierreReserva"
ADD CONSTRAINT "CierreReserva_estado_valido"
CHECK ("estado"::text IN ('ATENDIDA', 'NO_ASISTIO'));