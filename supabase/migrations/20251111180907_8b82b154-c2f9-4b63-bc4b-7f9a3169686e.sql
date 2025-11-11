-- Adicionar campos para tracking de status e retry
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS prediction_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS request_params JSONB;

-- Criar índice para buscar por prediction_id
CREATE INDEX IF NOT EXISTS idx_generated_images_prediction_id ON generated_images(prediction_id);

-- Criar índice para buscar por status
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON generated_images(status);

-- Habilitar realtime para a tabela (já está habilitado, apenas garantindo REPLICA IDENTITY)
ALTER TABLE generated_images REPLICA IDENTITY FULL;