/*
  Warnings:

  - A unique constraint covering the columns `[id,barberiaId]` on the table `Profesional` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,barberiaId]` on the table `Servicio` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "ProfesionalServicio" (
    "barberiaId" INTEGER NOT NULL,
    "profesionalId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,

    CONSTRAINT "ProfesionalServicio_pkey" PRIMARY KEY ("barberiaId","profesionalId","servicioId")
);

-- CreateIndex
CREATE INDEX "ProfesionalServicio_profesionalId_barberiaId_idx" ON "ProfesionalServicio"("profesionalId", "barberiaId");

-- CreateIndex
CREATE INDEX "ProfesionalServicio_servicioId_barberiaId_idx" ON "ProfesionalServicio"("servicioId", "barberiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_id_barberiaId_key" ON "Profesional"("id", "barberiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_id_barberiaId_key" ON "Servicio"("id", "barberiaId");

-- AddForeignKey
ALTER TABLE "ProfesionalServicio" ADD CONSTRAINT "ProfesionalServicio_profesionalId_barberiaId_fkey" FOREIGN KEY ("profesionalId", "barberiaId") REFERENCES "Profesional"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProfesionalServicio" ADD CONSTRAINT "ProfesionalServicio_servicioId_barberiaId_fkey" FOREIGN KEY ("servicioId", "barberiaId") REFERENCES "Servicio"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;
