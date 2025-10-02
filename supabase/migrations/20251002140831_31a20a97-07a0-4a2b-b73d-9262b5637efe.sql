-- Add in_development field to plugins table
ALTER TABLE public.plugins 
ADD COLUMN in_development boolean NOT NULL DEFAULT false;