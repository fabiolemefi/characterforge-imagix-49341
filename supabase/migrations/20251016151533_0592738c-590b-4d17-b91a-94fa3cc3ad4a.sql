-- Add new block types to the enum
ALTER TYPE brand_guide_block_type ADD VALUE IF NOT EXISTS 'title_only';
ALTER TYPE brand_guide_block_type ADD VALUE IF NOT EXISTS 'text_only';