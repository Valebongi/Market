-- Indices que sostienen el cupo de escritura por usuario (rate-limit.guard.ts).
-- Cada POST /requests y cada POST /requests/:id/messages hace un count sobre una
-- ventana de tiempo; sin estos indices ese control es un Seq Scan por escritura.
-- IF NOT EXISTS para que la migracion sea idempotente sobre una base que ya los
-- tenga (produccion pudo recibirlos por `db push`).

-- CreateIndex
CREATE INDEX IF NOT EXISTS "license_requests_requester_id_created_at_idx" ON "license_requests"("requester_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "license_requests_requester_id_owner_id_idx" ON "license_requests"("requester_id", "owner_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");
