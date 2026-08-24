-- CreateTable
CREATE TABLE "saved_assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved_assets_user_id_asset_id_key" ON "saved_assets"("user_id", "asset_id");

-- AddForeignKey
ALTER TABLE "saved_assets" ADD CONSTRAINT "saved_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
