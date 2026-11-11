-- CreateTable
CREATE TABLE "InvitacionEquipo" (
    "id" SERIAL NOT NULL,
    "barberiaId" INTEGER NOT NULL,
    "profesionalId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creadorId" INTEGER NOT NULL,
    "aceptadaPorId" INTEGER,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEn" TIMESTAMPTZ(3) NOT NULL,
    "aceptadaEn" TIMESTAMPTZ(3),
    "revocadaEn" TIMESTAMPTZ(3),

    CONSTRAINT "InvitacionEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionEquipo_tokenHash_key" ON "InvitacionEquipo"("tokenHash");

-- CreateIndex
CREATE INDEX "InvitacionEquipo_barberiaId_profesionalId_idx" ON "InvitacionEquipo"("barberiaId", "profesionalId");

-- CreateIndex
CREATE INDEX "InvitacionEquipo_barberiaId_email_idx" ON "InvitacionEquipo"("barberiaId", "email");

-- AddForeignKey
ALTER TABLE "InvitacionEquipo" ADD CONSTRAINT "InvitacionEquipo_profesionalId_barberiaId_fkey" FOREIGN KEY ("profesionalId", "barberiaId") REFERENCES "Profesional"("id", "barberiaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "InvitacionEquipo" ADD CONSTRAINT "InvitacionEquipo_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "InvitacionEquipo" ADD CONSTRAINT "InvitacionEquipo_aceptadaPorId_fkey" FOREIGN KEY ("aceptadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
