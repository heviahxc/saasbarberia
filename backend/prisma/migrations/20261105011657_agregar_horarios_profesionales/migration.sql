-- AlterTable
ALTER TABLE "Barberia" ADD COLUMN     "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Santiago';

-- CreateTable
CREATE TABLE "HorarioProfesional" (
    "id" SERIAL NOT NULL,
    "barberiaId" INTEGER NOT NULL,
    "profesionalId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "inicioMinuto" INTEGER NOT NULL,
    "finMinuto" INTEGER NOT NULL,

    CONSTRAINT "HorarioProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioProfesional_barberiaId_profesionalId_diaSemana_inici_key" ON "HorarioProfesional"("barberiaId", "profesionalId", "diaSemana", "inicioMinuto");

-- AddForeignKey
ALTER TABLE "HorarioProfesional" ADD CONSTRAINT "HorarioProfesional_profesionalId_barberiaId_fkey" FOREIGN KEY ("profesionalId", "barberiaId") REFERENCES "Profesional"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Validar el día y los límites del tramo
ALTER TABLE "HorarioProfesional"
ADD CONSTRAINT "HorarioProfesional_dia_valido"
CHECK ("diaSemana" BETWEEN 1 AND 7),
ADD CONSTRAINT "HorarioProfesional_minutos_validos"
CHECK (
  "inicioMinuto" >= 0
  AND "finMinuto" <= 1440
  AND "inicioMinuto" < "finMinuto"
);

-- Habilitar comparaciones de igualdad en el índice de exclusión
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Impedir tramos superpuestos del mismo profesional y día
ALTER TABLE "HorarioProfesional"
ADD CONSTRAINT "HorarioProfesional_sin_solapamientos"
EXCLUDE USING gist (
  "barberiaId" WITH =,
  "profesionalId" WITH =,
  "diaSemana" WITH =,
  int4range("inicioMinuto", "finMinuto", '[)') WITH &&
);