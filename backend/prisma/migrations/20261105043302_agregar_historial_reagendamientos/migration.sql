-- CreateTable
CREATE TABLE "ReagendamientoReserva" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "inicioAnterior" TIMESTAMPTZ(3) NOT NULL,
    "finAnterior" TIMESTAMPTZ(3) NOT NULL,
    "inicioNuevo" TIMESTAMPTZ(3) NOT NULL,
    "finNuevo" TIMESTAMPTZ(3) NOT NULL,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReagendamientoReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReagendamientoReserva_reservaId_creadoEn_idx" ON "ReagendamientoReserva"("reservaId", "creadoEn");

-- CreateIndex
CREATE INDEX "ReagendamientoReserva_actorId_idx" ON "ReagendamientoReserva"("actorId");

-- AddForeignKey
ALTER TABLE "ReagendamientoReserva" ADD CONSTRAINT "ReagendamientoReserva_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReagendamientoReserva" ADD CONSTRAINT "ReagendamientoReserva_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ReagendamientoReserva"
ADD CONSTRAINT "ReagendamientoReserva_intervalos_validos"
CHECK (
  isfinite("inicioAnterior")
  AND isfinite("finAnterior")
  AND isfinite("inicioNuevo")
  AND isfinite("finNuevo")
  AND "finAnterior" > "inicioAnterior"
  AND "finNuevo" > "inicioNuevo"
),

ADD CONSTRAINT "ReagendamientoReserva_misma_duracion"
CHECK (
  ("finAnterior" - "inicioAnterior")
  = ("finNuevo" - "inicioNuevo")
),

ADD CONSTRAINT "ReagendamientoReserva_horario_distinto"
CHECK (
  "inicioAnterior" <> "inicioNuevo"
);