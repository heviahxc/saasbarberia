-- Ampliar la coherencia de cancelación para admitir los estados de cierre.
-- No modifica estados ni fechas existentes.
BEGIN;
ALTER TABLE "Reserva"
  DROP CONSTRAINT "Reserva_cancelacion_coherente",
  ADD CONSTRAINT "Reserva_cancelacion_coherente"
  CHECK (
    ("estado" = 'CANCELADA' AND "canceladoEn" IS NOT NULL)
    OR
    ("estado" IN ('CONFIRMADA', 'ATENDIDA', 'NO_ASISTIO') AND "canceladoEn" IS NULL)
  );
COMMIT;
