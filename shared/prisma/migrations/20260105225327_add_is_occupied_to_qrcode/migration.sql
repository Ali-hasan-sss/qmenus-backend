-- AlterTable
-- Use IF NOT EXISTS to avoid error if column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_codes' AND column_name = 'isOccupied'
    ) THEN
        ALTER TABLE "qr_codes" ADD COLUMN "isOccupied" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

