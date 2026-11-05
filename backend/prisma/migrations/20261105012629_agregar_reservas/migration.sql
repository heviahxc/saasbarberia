-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "barberiaId" INTEGER NOT NULL,
    "profesionalId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "precioAcordado" DECIMAL(10,2) NOT NULL,
    "nombreServicio" TEXT NOT NULL,
    "zonaHoraria" TEXT NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'CONFIRMADA',
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoEn" TIMESTAMPTZ(3),

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reserva_clienteId_inicio_idx" ON "Reserva"("clienteId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_barberiaId_inicio_idx" ON "Reserva"("barberiaId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_profesionalId_barberiaId_inicio_idx" ON "Reserva"("profesionalId", "barberiaId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_servicioId_barberiaId_idx" ON "Reserva"("servicioId", "barberiaId");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_profesionalId_barberiaId_fkey" FOREIGN KEY ("profesionalId", "barberiaId") REFERENCES "Profesional"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_servicioId_barberiaId_fkey" FOREIGN KEY ("servicioId", "barberiaId") REFERENCES "Servicio"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Validar duración e intervalo
ALTER TABLE "Reserva"
ADD CONSTRAINT "Reserva_duracion_valida"
CHECK ("duracionMinutos" BETWEEN 1 AND 1440),

ADD CONSTRAINT "Reserva_intervalo_valido"
CHECK (
  isfinite("inicio")
  AND isfinite("fin")
  AND "fin" > "inicio"
  AND ("fin" - "inicio")
      = "duracionMinutos" * INTERVAL '1 minute'
),

-- Validar el precio acordado
ADD CONSTRAINT "Reserva_precio_valido"
CHECK (
  "precioAcordado" >= 0
  AND "precioAcordado" <> 'NaN'::numeric
),

-- Mantener coherencia entre estado y cancelación
ADD CONSTRAINT "Reserva_cancelacion_coherente"
CHECK (
  (
    "estado" = 'CONFIRMADA'
    AND "canceladoEn" IS NULL
  )
  OR
  (
    "estado" = 'CANCELADA'
    AND "canceladoEn" IS NOT NULL
    AND isfinite("canceladoEn")
    AND "canceladoEn" >= "creadoEn"
  )
);

-- Ya se instaló para los horarios; esta instrucción es reutilizable
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Impedir reservas confirmadas superpuestas
ALTER TABLE "Reserva"
ADD CONSTRAINT "Reserva_sin_solapamientos"
EXCLUDE USING gist (
  "barberiaId" WITH =,
  "profesionalId" WITH =,
  tstzrange("inicio", "fin", '[)') WITH &&
)
WHERE ("estado" = 'CONFIRMADA');