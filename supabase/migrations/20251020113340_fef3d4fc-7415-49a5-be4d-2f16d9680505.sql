-- Remove the existing constraint that prevents both page_id and category_id from being null
ALTER TABLE brand_guide_blocks DROP CONSTRAINT IF EXISTS brand_guide_blocks_check;

-- Add a new constraint that allows:
-- 1. Both page_id and category_id to be NULL (for home page blocks)
-- 2. page_id to be NOT NULL and category_id to be NULL (for page-specific blocks)
-- 3. page_id to be NULL and category_id to be NOT NULL (for category-specific blocks)
ALTER TABLE brand_guide_blocks ADD CONSTRAINT brand_guide_blocks_check 
CHECK (
  (page_id IS NULL AND category_id IS NULL) OR 
  (page_id IS NOT NULL AND category_id IS NULL) OR 
  (page_id IS NULL AND category_id IS NOT NULL)
);