-- Add new block types to the brand_guide_block_type enum
ALTER TYPE brand_guide_block_type ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE brand_guide_block_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE brand_guide_block_type ADD VALUE IF NOT EXISTS 'embed';