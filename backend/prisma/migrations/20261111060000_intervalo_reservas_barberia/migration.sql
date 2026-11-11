ALTER TABLE "Barberia" ADD COLUMN "intervaloReservasMinutos" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "Barberia" ADD CONSTRAINT "Barberia_intervalo_reservas_valido" CHECK ("intervaloReservasMinutos" IN (15, 30));
