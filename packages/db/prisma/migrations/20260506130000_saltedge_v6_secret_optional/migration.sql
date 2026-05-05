-- Migration: saltedge_v6_secret_optional
-- Salt Edge v6 no devuelve customer-secret; hacemos la columna nullable
-- para clientes existentes y no la usamos en nuevas conexiones.

ALTER TABLE "se_customers" ALTER COLUMN "secret" DROP NOT NULL;
