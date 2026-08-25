-- CreateIndex
CREATE INDEX "license_requests_requester_id_updated_at_idx" ON "license_requests"("requester_id", "updated_at");

-- CreateIndex
CREATE INDEX "license_requests_owner_id_updated_at_idx" ON "license_requests"("owner_id", "updated_at");

-- CreateIndex
CREATE INDEX "messages_request_id_read_at_idx" ON "messages"("request_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

