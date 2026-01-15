-- Add type column to complaint_like table to support LIKE/DISLIKE reactions

ALTER TABLE complaint_like 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'LIKE';

-- Update the unique constraint to include type
ALTER TABLE complaint_like 
DROP CONSTRAINT IF EXISTS complaint_like_complaint_no_user_no_key;

ALTER TABLE complaint_like 
ADD CONSTRAINT complaint_like_unique_reaction UNIQUE(complaint_no, user_no);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_complaint_like_type ON complaint_like(type);
