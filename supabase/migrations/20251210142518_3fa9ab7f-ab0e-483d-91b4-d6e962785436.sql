-- Add user_id column to generated_images table
ALTER TABLE generated_images 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);