ALTER TABLE public.image_campaign_assets 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.image_campaign_assets.thumbnail_url IS 
'URL da imagem de thumbnail para exibição na seleção. Se nulo, usa image_url.';