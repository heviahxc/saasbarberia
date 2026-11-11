-- AlterTable
ALTER TABLE "ReagendamientoReserva" ADD COLUMN     "motivo" VARCHAR(300);

-- CreateTable
CREATE TABLE "CancelacionReserva" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "motivo" VARCHAR(300),
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancelacionReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancelacionReserva_reservaId_key" ON "CancelacionReserva"("reservaId");

-- CreateIndex
CREATE INDEX "CancelacionReserva_actorId_idx" ON "CancelacionReserva"("actorId");

-- AddForeignKey
ALTER TABLE "CancelacionReserva" ADD CONSTRAINT "CancelacionReserva_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CancelacionReserva" ADD CONSTRAINT "CancelacionReserva_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
