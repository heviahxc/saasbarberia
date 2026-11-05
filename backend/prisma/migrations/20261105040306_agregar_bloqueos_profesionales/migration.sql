-- CreateTable
CREATE TABLE "BloqueoProfesional" (
    "id" SERIAL NOT NULL,
    "barberiaId" INTEGER NOT NULL,
    "profesionalId" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BloqueoProfesional_barberiaId_profesionalId_inicio_idx" ON "BloqueoProfesional"("barberiaId", "profesionalId", "inicio");

-- AddForeignKey
ALTER TABLE "BloqueoProfesional" ADD CONSTRAINT "BloqueoProfesional_profesionalId_barberiaId_fkey" FOREIGN KEY ("profesionalId", "barberiaId") REFERENCES "Profesional"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Exigir fechas finitas y un intervalo de duración positiva
ALTER TABLE "BloqueoProfesional"
ADD CONSTRAINT "BloqueoProfesional_intervalo_valido"
CHECK (
  isfinite("inicio")
  AND isfinite("fin")
  AND "fin" > "inicio"
);