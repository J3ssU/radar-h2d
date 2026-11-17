BEGIN;
CREATE TABLE IF NOT EXISTS radar.historial_renovaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registro_id bigint NOT NULL REFERENCES radar.registros_gps(id),
  creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  responsable text NOT NULL CHECK (length(trim(responsable)) BETWEEN 2 AND 100),
  identidad_verificada boolean NOT NULL DEFAULT false,
  motivo text NOT NULL CHECK (length(trim(motivo)) BETWEEN 3 AND 1000),
  anio smallint NOT NULL CHECK (anio BETWEEN 2025 AND 2028),
  fecha_fin_anterior date,
  fecha_fin_nueva date NOT NULL,
  estado_anterior text,
  estado_nuevo text NOT NULL CHECK (estado_nuevo = 'RENOVADO')
);
CREATE INDEX IF NOT EXISTS historial_renovaciones_registro_idx
  ON radar.historial_renovaciones (registro_id, creado_en DESC, id DESC);
ALTER TABLE radar.historial_renovaciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON radar.historial_renovaciones FROM PUBLIC, anon, authenticated;
COMMIT;
