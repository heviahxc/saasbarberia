-- CreateTable
CREATE TABLE "Profesional" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "barberiaId" INTEGER NOT NULL,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "barberiaId" INTEGER NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profesional_barberiaId_idx" ON "Profesional"("barberiaId");

-- CreateIndex
CREATE INDEX "Servicio_barberiaId_idx" ON "Servicio"("barberiaId");

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_barberiaId_fkey" FOREIGN KEY ("barberiaId") REFERENCES "Barberia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
