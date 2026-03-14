# Migração Completa do Efimagem

> Documento de migração para recriar o sistema Efimagem em outro projeto.
> Gerado em: 2026-03-14

---

## Índice

1. [Visão Geral](#visão-geral)
2. [SQL — Criação das Tabelas](#sql--criação-das-tabelas)
3. [SQL — Dados (INSERT)](#sql--dados-insert)
4. [Storage](#storage)
5. [Edge Functions](#edge-functions)
6. [Config.toml](#configtoml)
7. [Secrets](#secrets)
8. [Componentes Frontend](#componentes-frontend)
9. [Prompt para LLM](#prompt-para-llm)

---

## 1. Visão Geral

O **Efimagem** é um sistema de geração de imagens com personagens usando o modelo **Google Nano Banana** via **Replicate API**. Ele permite:

- Selecionar personagens com imagens de referência
- Digitar um prompt descrevendo a pose/ação desejada
- Gerar imagens via Replicate (async com webhook)
- Editar imagens geradas (re-prompting)
- Remover background de imagens
- Modo especial "Brindes" com editor de máscaras (Bézier + círculos)
- Galeria com realtime updates

### Arquitetura

```
Frontend (Efimagem.tsx)
  ↓ supabase.functions.invoke()
Edge Function (generate-character-image)
  ↓ replicate.predictions.create() com webhook
Replicate (google/nano-banana)
  ↓ webhook POST
Edge Function (replicate-webhook)
  ↓ download imagem → upload Storage → update DB
Frontend (Realtime subscription atualiza UI)
```

---

## 2. SQL — Criação das Tabelas

### 2.1 Tabela `plugins`

```sql
CREATE TABLE IF NOT EXISTS public.plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  general_prompt text,
  is_active boolean DEFAULT true,
  is_new boolean DEFAULT false,
  in_development boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plugins" ON public.plugins
  FOR SELECT USING (is_active = true AND in_development = false);

CREATE POLICY "Admins can manage plugins" ON public.plugins
  FOR ALL USING (public.is_admin(auth.uid()));
```

### 2.2 Tabela `plugin_characters`

```sql
CREATE TABLE IF NOT EXISTS public.plugin_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id uuid NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  name text NOT NULL,
  general_prompt text DEFAULT '',
  is_active boolean DEFAULT true,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plugin_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view characters" ON public.plugin_characters
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage characters" ON public.plugin_characters
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

### 2.3 Tabela `character_images`

```sql
CREATE TABLE IF NOT EXISTS public.character_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.plugin_characters(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position integer DEFAULT 0,
  is_cover boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.character_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view character images" ON public.character_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage character images" ON public.character_images
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

### 2.4 Tabela `generated_images`

```sql
CREATE TABLE IF NOT EXISTS public.generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES public.plugin_characters(id),
  character_name text NOT NULL,
  prompt text NOT NULL,
  image_url text NOT NULL,
  prediction_id text,
  status text DEFAULT 'pending',
  error_message text,
  request_params jsonb,
  retry_count integer DEFAULT 0,
  seal_type text,
  source text,
  user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Realtime (necessário para atualização automática no frontend)
ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_images;

CREATE POLICY "Anyone can view generated images" ON public.generated_images
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert" ON public.generated_images
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update" ON public.generated_images
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete" ON public.generated_images
  FOR DELETE USING (true);
```

### 2.5 Função auxiliar `is_admin` (se não existir)

```sql
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND is_admin = true
  )
$$;
```

---

## 3. SQL — Dados (INSERT)

### 3.1 Plugin Efimagem

```sql
INSERT INTO public.plugins (id, name, description, image_url, general_prompt, is_active, is_new, in_development)
VALUES (
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Efimagem',
  NULL,
  'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759850055215-0.20042605923838352.png',
  'Crie uma imagem de alta qualidade e profissional desse personagem, ele sempre deve ter 5 dedos mas nunca mais que 5 dedos por mão, a imagem deve ter fundo preto sólido e o personagem em alto contraste, cores vivas e textura perfeita. O personagem deve estar realizando uma ação natural e dinâmica, evitando poses estáticas ou olhares frontais. Capture o momento da ação como se fosse um frame de vídeo — movimento real, expressão viva, corpo em leve rotação ou interação com o ambiente. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar: ',
  true,
  false,
  false
);
```

### 3.2 Personagens (10)

```sql
-- 1. Rubens
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  'de8dabb8-17d3-41c5-907d-e3fc94b597b4',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Rubens',
  'Esse é o Rubens. Crie uma imagem de alta qualidade e profissional desse personagem com Iluminação de estúdio, ele sempre deve ter 5 dedos mas nunca mais que 5 dedos por mão, a imagem deve ter alto contraste, cores vivas e textura perfeita. adicione luz de estúdio marcante, reflexo suave nos olhos porém sem aumentar o tamanho deles, textura visivel para os tecidos com o padrão maior, adicionando detalhes as roupas, contraste e melhorar a cor para ficar mais vivo e com muita nitidez.  O cabelo deve ter uma textura suave e aparentemente felpuda e macia. O personagem deve estar realizando uma ação natural e dinâmica, evitando poses estáticas ou olhares frontais. Capture o momento da ação como se fosse um frame de vídeo — movimento real, expressão viva, corpo em leve rotação ou interação com o ambiente. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 1
);

-- 2. Rubí
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  'fbb62dba-3404-494d-bc34-430b46e667ce',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Rubí',
  'Essa é a Rubí. Crie uma imagem de alta qualidade, com Iluminação de estúdio e profissional desse personagem, ele sempre deve ter 5 dedos mas nunca mais que 5 dedos por mão, a imagem deve ter cores vivas e textura perfeita. adicione luz de estúdio marcante, reflexo suave nos olhos porém sem aumentar o tamanho deles, textura visivel para os tecidos com o padrão maior, adicionando detalhes as roupas, contraste e melhorar a cor para ficar mais vivo e com muita nitidez.  O cabelo deve ter uma textura suave e aparentemente felpuda e macia. O personagem deve estar realizando uma ação natural e dinâmica, evitando poses estáticas ou olhares frontais. Capture o momento da ação como se fosse um frame de vídeo — movimento real, expressão viva, corpo em leve rotação ou interação com o ambiente. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 2
);

-- 3. Greg
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Greg',
  'Esse é o Greg. Crie uma imagem de alta qualidade e profissional desse personagem com Iluminação de estúdio, ele sempre deve ter 5 dedos mas nunca mais que 5 dedos por mão, a imagem deve ter alto contraste, cores vivas e textura perfeita. Ele sempre estará utilizando 1 relógio de pulso e óculos no rosto. Quando mostrar um celular, mostre um branco. Adicione luz de estúdio marcante, reflexo suave nos olhos porém sem aumentar o tamanho deles, textura visivel para os tecidos com o padrão maior, adicionando detalhes as roupas, contraste e melhorar a cor para ficar mais vivo e com muita nitidez. O cabelo deve ter uma textura suave e aparentemente felpuda e macia. O personagem deve estar realizando uma ação natural e dinâmica, evitando poses estáticas ou olhares frontais. Capture o momento da ação como se fosse um frame de vídeo — movimento real, expressão viva, corpo em leve rotação ou interação com o ambiente. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 3
);

-- 4. Fubá
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  '9eaab5a0-2033-4cd2-9c83-f250f668cd3a',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Fubá',
  'Crie uma imagem de alta qualidade, profissional e com Iluminação de estúdio desse personagem. A imagem deve ter cores vivas e textura perfeita de tecido felpudo. O personagem deve estar realizando uma ação natural e dinâmica, evitando poses estáticas ou olhares frontais. Capture o momento da ação como se fosse um frame de vídeo, movimento real, expressão viva, corpo em leve rotação ou interação com o ambiente. adicione luz de estúdio marcante, reflexo suave nos olhos porém sem aumentar o tamanho deles, textura visivel para os tecidos com o padrão maior, adicionando detalhes as roupas, contraste e melhorar a cor para ficar mais vivo e com muita nitidez.  O pelo  deve ter uma textura suave e aparentemente felpuda e macia. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 4
);

-- 5. Fernando Paiva
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  'e14902e1-6349-41b4-a3ea-5d61d8eea2cf',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Fernando Paiva',
  'Esse é o Fernando Paiva. Crie uma imagem de alta qualidade e profissional desse personagem. A pessoa tem o rosto em formato oval com mandíbula suavemente marcada e maçãs do rosto discretas, o nariz é de tamanho mediano com dorso retilíneo e ponta levemente arredondada, os lábios são proporcionais com contornos definidos e boca em expressão neutra, os olhos são amendoados com pálpebras discretas e olhar direcionado para a frente com foco e intensidade, as sobrancelhas são medianas em espessura com leve arqueamento natural, a pele tem tonalidade média com acabamento fosco e textura regular, o cabelo é escuro, liso com discretas ondulações nas pontas, comprimento até os ombros com volume moderado e repartido lateralmente, o pescoço é visível e bem definido, a postura do corpo é ereta e transmite confiança, o porte físico indica estatura mediana e proporções equilibradas, os ombros são retos e o tronco é alinhado, o semblante transmite profissionalismo, autocontrole e assertividade. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 5
);

-- 6. Igor Almeida
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  '32d1b831-ba3c-4a87-a0f3-ad4a868aced4',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Igor Almeida',
  'Esse é o Igor Almeida. Crie uma imagem de alta qualidade e profissional desse personagem. A pessoa tem o rosto em formato oval com mandíbula suavemente marcada e maçãs do rosto discretas, o nariz é de tamanho mediano com dorso retilíneo e ponta levemente arredondada, os lábios são proporcionais com contornos definidos e boca em expressão neutra, os olhos são amendoados com pálpebras discretas e olhar direcionado para a frente com foco e intensidade, as sobrancelhas são medianas em espessura com leve arqueamento natural, a pele tem tonalidade média com acabamento fosco e textura regular, o cabelo é escuro, liso com discretas ondulações nas pontas, comprimento até os ombros com volume moderado e repartido lateralmente, o pescoço é visível e bem definido, a postura do corpo é ereta e transmite confiança, o porte físico indica estatura mediana e proporções equilibradas, os ombros são retos e o tronco é alinhado, o semblante transmite profissionalismo, autocontrole e assertividade. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 6
);

-- 7. Regina Carvalho
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  'c0cb5a46-d3c7-4222-ae2b-d054a14c4502',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Regina Carvalho',
  'Esse é a Regina. Crie uma imagem de alta qualidade e profissional desse personagem. A pessoa está em pé em frente a um fundo cinza suave, tem um penteado volumoso de comprimento médio com ondas suaves que emolduram o rosto, o formato do rosto é oval com maçãs do rosto definidas e um queixo ligeiramente pontudo, a pele parece lisa e uniforme com um tom quente, as sobrancelhas são cheias e arqueadas em um formato natural, os olhos são amendoados com um olhar focado e composto, o nariz é reto e proporcional com uma ponte sutil, os lábios são médios em volume com um formato natural relaxado, a expressão é calma e confiante com uma sugestão de um sorriso gentil, a postura é ereta e composta com os braços cruzados em uma imagem e uma mão na cintura em outra, a estrutura corporal é média com proporções equilibradas e uma postura equilibrada, vestindo um blazer texturizado cinza claro com listras verticais sutis sobre uma blusa branca com decote em V suave, um pequeno colar com pingente circular adiciona um detalhe mínimo, mas elegante, a iluminação é suave e difusa na frente e ligeiramente acima, criando sombras suaves e uma sensação de estúdio profissional, o clima geral é confiante, acessível e autoritário. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 6
);

-- 8. Edson Ribeiro
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  '6c5810ad-9935-492c-a057-7ea69b233071',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Edson Ribeiro',
  'Esse é o Edson. Crie uma imagem de alta qualidade e profissional desse personagem. A pessoa tem um rosto arredondado com um queixo suavemente contornado e pele lisa e de tom uniforme, uma testa larga que transita suavemente para um penteado curto e bem cacheado com pouco volume e uma borda limpa e afilada ao longo do pescoço, as sobrancelhas são moderadamente grossas com um arco natural e assentam uniformemente acima de olhos amendoados ligeiramente profundos, o nariz é de largura média com uma ponte reta e uma ponta sutilmente arredondada, os lábios são cheios e bem definidos com uma curva suave para cima sugerindo um comportamento composto e acessível, o queixo é suavemente arredondado e se funde naturalmente com o maxilar, o pescoço é robusto e proporcional, a estrutura do corpo é atarracada e sólida com um peito largo, ombros largos e braços grossos indicando uma constituição forte, o tronco é ligeiramente largo na cintura, sugerindo um tipo de corpo retangular com afunilamento mínimo, as proporções gerais transmitem equilíbrio e confiança, a pessoa mantém uma postura relaxada. A descrição a seguir deve complementar e especificar a ação desejada pelo usuário. O personagem deve estar:',
  true, 7
);

-- 9. Brindes
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  '1648e414-7f3b-46bf-b03e-2849e2793fdd',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Brindes',
  'Existem duas imagens iguais porém com a diferença de uma ter a informação de onde deve ser aplicado o logo e a textura que estão em anexo, servirá de máscara de referencia do objeto onde deve ser levado em conta a referencia da posição que devem estar ou preencher. Ao aplicar a imagem 3, deve ser onde existir o circulo amarelo, o tamanho da terceira imagem aplicada à primeira deve ser adaptado à area existente em cada contexto, adaptando curvas e profundidades necessárias e manter o fundo transparente adaptada ao tamanho da area de referencia que não é literal e removendo o circulo amarelo da imagem final. O pattern deve preencher a parte pintada em vermelho de referencia. Respeite as sombras e luzes da imagem. Utilize fundo infinito branco e luzes de estúdio, e para isso recrie em alta resolução o objeto final. Faça o upscale.',
  true, 10
);

-- 10. Criador de ADS
INSERT INTO public.plugin_characters (id, plugin_id, name, general_prompt, is_active, position)
VALUES (
  '9a7e6d8b-2a78-45ae-83dd-ee549778f01b',
  'c4a4247e-fae8-4d8f-ab65-972811f7f190',
  'Criador de ADS',
  'Crie uma imagem no mesmo estilo das imagens de referencia em anexo.',
  true, 10
);
```

### 3.3 Imagens de Referência (45)

```sql
-- Rubens (5 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('9ae9a957-d8b7-4945-a170-c05ba2c3bfab', 'de8dabb8-17d3-41c5-907d-e3fc94b597b4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839817714-0.35521641809137927.png', 3, false),
  ('37e19ebc-260e-45c4-802d-7a1ffa84b5b5', 'de8dabb8-17d3-41c5-907d-e3fc94b597b4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839819938-0.06857734272795113.png', 6, false),
  ('bf037487-db6b-4bdd-80da-fd607891d84f', 'de8dabb8-17d3-41c5-907d-e3fc94b597b4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839820712-0.74343696504816.png', 7, false),
  ('91bcc57e-c386-402b-9b92-a4fc3fb86bef', 'de8dabb8-17d3-41c5-907d-e3fc94b597b4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839821331-0.38962922076689355.png', 8, true),
  ('84d0b7bf-7f05-40f0-af05-f7b0c5d5f3f1', 'de8dabb8-17d3-41c5-907d-e3fc94b597b4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839821935-0.5609760668359154.png', 9, false);

-- Rubí (6 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('7bd50f75-9f33-48ab-b259-3b4a73eb103b', 'fbb62dba-3404-494d-bc34-430b46e667ce', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839851581-0.0007094051917905242.png', 0, false),
  ('94b9c28c-a570-4e3a-81be-26e572c1f79f', 'fbb62dba-3404-494d-bc34-430b46e667ce', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839852951-0.47185110648775663.png', 1, false),
  ('c1ed662b-87a7-4334-9a4d-6265bae00543', 'fbb62dba-3404-494d-bc34-430b46e667ce', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839855363-0.7328208542715008.png', 4, true),
  ('bc0c802f-bb7b-45b0-9cb8-0b6a1ac73801', 'fbb62dba-3404-494d-bc34-430b46e667ce', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839856008-0.10463530699204093.png', 5, false),
  ('5dcf251e-a7f5-4a01-a604-e9bdf166999e', 'fbb62dba-3404-494d-bc34-430b46e667ce', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839857285-0.8556929190664987.png', 7, false),
  ('1379fb06-1ff4-4950-8d3f-d6c3add0c6b2', 'fbb62dba-3404-494d-bc34-430b46e667ce', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759839857870-0.6672605012991942.png', 8, false);

-- Greg (8 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('8a679050-4d34-4dd2-944d-7c1aef6d5597', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380734710-0.3653257403622129.png', 0, true),
  ('0c419c82-96cf-48a7-b971-bab812b9fbff', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380735688-0.22062163699001325.png', 1, false),
  ('21e2a983-0c90-4703-a12c-b1f5e951e31b', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380736629-0.2770862742623216.png', 2, false),
  ('96208dd8-d85c-4fae-a139-851f7f1f8b05', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380737545-0.6771485599677787.png', 3, false),
  ('9b984a3f-cdd0-4788-bf03-de157c896e82', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380738534-0.011857260367589717.png', 4, false),
  ('bf40c221-7e3b-44c1-b8e1-b1fb96224626', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380739501-0.14796227760965253.png', 5, false),
  ('ad9746bb-2fcf-44d1-b628-c8319d495a0f', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380740552-0.9999995050423822.png', 6, false),
  ('a3b4f702-d0a2-4a51-942c-89140cef864d', '53b1a48f-6dc8-46b1-816b-8a5f7be96d2b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760380741509-0.9125815869805645.png', 7, false);

-- Fubá (3 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('b4dd18e9-cba0-4562-8bc9-4a72a38bf8ee', '9eaab5a0-2033-4cd2-9c83-f250f668cd3a', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759863330424-0.7030242203838756.png', 0, false),
  ('ae49a977-4cc8-4937-8de0-50d659c9d451', '9eaab5a0-2033-4cd2-9c83-f250f668cd3a', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759863332270-0.9278715208959413.png', 1, false),
  ('d4f3afb3-cece-4348-882c-fc5e9bbde511', '9eaab5a0-2033-4cd2-9c83-f250f668cd3a', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1759863333165-0.41792907777710797.png', 2, false);

-- Fernando Paiva (5 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('be10d28c-6bbb-4d95-86d9-10f2fa562055', 'e14902e1-6349-41b4-a3ea-5d61d8eea2cf', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466273330-0.3485199530454415.png', 0, false),
  ('28b8e18e-1f1f-4918-9a81-89ed4ac79d50', 'e14902e1-6349-41b4-a3ea-5d61d8eea2cf', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466276302-0.2301600442439643.png', 1, false),
  ('3ac2a354-722c-4057-adfe-e28ef53b963f', 'e14902e1-6349-41b4-a3ea-5d61d8eea2cf', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466278066-0.7037830166381128.png', 2, false),
  ('195e2fba-bb82-4d95-88c8-279a66efcc6d', 'e14902e1-6349-41b4-a3ea-5d61d8eea2cf', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466279964-0.702454595398282.png', 3, false),
  ('334c3e25-90b5-41f7-b6b2-191310d51173', 'e14902e1-6349-41b4-a3ea-5d61d8eea2cf', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466282057-0.9777519692197528.png', 4, true);

-- Igor Almeida (5 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('7075d893-4799-4d4d-8958-90dbe0cc60a4', '32d1b831-ba3c-4a87-a0f3-ad4a868aced4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466473854-0.4763654695904127.png', 0, true),
  ('402d7a5a-fed8-4fdb-9f9d-1c3ea9a189cb', '32d1b831-ba3c-4a87-a0f3-ad4a868aced4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466476861-0.9227523130973233.png', 1, false),
  ('54b43193-ec99-462b-8766-c7814477c156', '32d1b831-ba3c-4a87-a0f3-ad4a868aced4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466478801-0.7316149689745276.png', 2, false),
  ('b99e2820-cd1a-492d-b30c-cac6046c7a4b', '32d1b831-ba3c-4a87-a0f3-ad4a868aced4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466480734-0.8579718530349968.png', 3, false),
  ('e5e26265-4f8f-4d08-96ef-507f03db8974', '32d1b831-ba3c-4a87-a0f3-ad4a868aced4', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760466482445-0.9432502470881171.png', 4, false);

-- Regina Carvalho (5 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('ac7a9a56-3e78-4e52-b5d5-93a8cfb98e87', 'c0cb5a46-d3c7-4222-ae2b-d054a14c4502', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379478953-0.3181938222149234.png', 0, false),
  ('220c9ba4-aab3-48eb-aed6-50f3a822242c', 'c0cb5a46-d3c7-4222-ae2b-d054a14c4502', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379483650-0.6219768448284999.png', 1, true),
  ('2d2762d7-c9cd-4530-aca5-a5e54d6709b0', 'c0cb5a46-d3c7-4222-ae2b-d054a14c4502', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379487882-0.3780291893237687.png', 2, false),
  ('10429119-5e83-4616-b94c-77fa6642cf9b', 'c0cb5a46-d3c7-4222-ae2b-d054a14c4502', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379492073-0.033891316187212306.png', 3, false),
  ('4b05546b-3b95-43b4-b84c-d9f6dd50e316', 'c0cb5a46-d3c7-4222-ae2b-d054a14c4502', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379496159-0.5276764554408071.png', 4, false);

-- Edson Ribeiro (5 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('bc220cc5-6597-4269-93d5-32d5608931fc', '6c5810ad-9935-492c-a057-7ea69b233071', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379451587-0.47517801558199.png', 0, false),
  ('4ba26f2b-1d7a-41c3-a833-a2801b598195', '6c5810ad-9935-492c-a057-7ea69b233071', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379453497-0.8039215046373981.png', 1, false),
  ('786f3a51-ac26-44ab-9e1f-a9327b89c970', '6c5810ad-9935-492c-a057-7ea69b233071', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379454670-0.7654877266028449.png', 2, false),
  ('0be23b53-97e7-4920-b227-e6b6a6421e73', '6c5810ad-9935-492c-a057-7ea69b233071', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379456611-0.3069472614130573.png', 3, true),
  ('54470307-8774-4a3a-81ef-fc22aaa545f5', '6c5810ad-9935-492c-a057-7ea69b233071', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1760379459129-0.13270469596990309.png', 4, false);

-- Brindes (2 imagens)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('4582c23b-4866-4de6-82f6-dfdb7195de10', '1648e414-7f3b-46bf-b03e-2849e2793fdd', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1761072350994-0.11153270053909004.png', 1, false),
  ('11d790f8-6335-4175-ae6e-3ee57ec00e0e', '1648e414-7f3b-46bf-b03e-2849e2793fdd', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1761225851774-0.5965332893984161.png', 2, false);

-- Criador de ADS (1 imagem)
INSERT INTO public.character_images (id, character_id, image_url, position, is_cover) VALUES
  ('2ca9cfc0-ae9f-4e3c-90e6-bec800876bbd', '9a7e6d8b-2a78-45ae-83dd-ee549778f01b', 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/plugin-images/1766510316053-0.7363824081172688.png', 0, false);
```

> **Nota**: As URLs acima apontam para o bucket público do projeto original. Se quiser independência total, faça download e re-upload para o novo projeto.

---

## 4. Storage

Criar bucket público para armazenar imagens:

```sql
-- Via Supabase Dashboard ou API
INSERT INTO storage.buckets (id, name, public) 
VALUES ('plugin-images', 'plugin-images', true);
```

Ou via dashboard: **Storage → New Bucket → `plugin-images` → Public**.

### Policies de Storage

```sql
-- Qualquer um pode ler
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'plugin-images');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Auth upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'plugin-images' AND auth.uid() IS NOT NULL);
```

---

## 5. Edge Functions

### 5.1 `generate-character-image/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY is not set");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const { imageUrls, prompt, generalPrompt = "", characterName, characterId, aspectRatio = "1:1" } = await req.json();

    // Get user_id from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!imageUrls?.length)
      return new Response(JSON.stringify({ error: "imageUrls array is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });

    if (!prompt)
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });

    // Limitar a 6 imagens para evitar erro do modelo
    const limitedImageUrls = imageUrls.slice(0, 6);
    const enhancedPrompt = prompt;

    // Criar registro no banco imediatamente com status 'pending'
    const { data: dbRecord, error: dbError } = await supabase
      .from("generated_images")
      .insert({
        character_name: characterName || "Unknown",
        character_id: characterId || null,
        prompt: enhancedPrompt,
        image_url: "",
        status: "pending",
        user_id: userId,
        request_params: {
          image_input: limitedImageUrls,
          prompt: enhancedPrompt,
          generalPrompt,
          characterName,
          characterId,
          aspectRatio
        }
      })
      .select()
      .single();

    if (dbError) throw new Error(`Failed to create database record: ${dbError.message}`);

    // Iniciar predição assíncrona no Replicate com webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;

    const prediction = await replicate.predictions.create({
      version: "google/nano-banana",
      input: {
        prompt: enhancedPrompt,
        image_input: limitedImageUrls,
        aspect_ratio: aspectRatio,
        output_format: "png",
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    // Atualizar registro com prediction_id e status 'processing'
    await supabase
      .from("generated_images")
      .update({ prediction_id: prediction.id, status: "processing" })
      .eq("id", dbRecord.id);

    return new Response(JSON.stringify({ 
      recordId: dbRecord.id,
      predictionId: prediction.id,
      status: "processing"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

### 5.2 `edit-character-image/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY is not set");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { imageUrl, prompt, imageId } = await req.json();

    if (!imageUrl || !prompt) {
      throw new Error('imageUrl and prompt are required');
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const prediction = await replicate.predictions.create({
      version: "google/nano-banana",
      input: {
        prompt: prompt,
        image_input: [imageUrl],
        aspect_ratio: "match_input_image",
        output_format: "png",
      },
      webhook: `${SUPABASE_URL}/functions/v1/replicate-webhook`,
      webhook_events_filter: ["completed"],
    });

    let recordId = imageId;
    
    if (imageId) {
      await supabase
        .from("generated_images")
        .update({
          prediction_id: prediction.id,
          status: "processing",
          request_params: { imageUrl, prompt, type: "edit" },
        })
        .eq("id", imageId);
    } else {
      const { data: newRecord, error: insertError } = await supabase
        .from("generated_images")
        .insert({
          character_name: "Edited Image",
          prompt: prompt,
          image_url: imageUrl,
          prediction_id: prediction.id,
          status: "processing",
          request_params: { imageUrl, prompt, type: "edit" },
        })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create record: ${insertError.message}`);
      recordId = newRecord.id;
    }

    return new Response(
      JSON.stringify({ recordId, predictionId: prediction.id, status: "processing" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error editing image:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

### 5.3 `remove-background/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY is not set");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { imageUrl, imageId } = await req.json();

    if (!imageUrl) throw new Error('imageUrl is required');

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const prediction = await replicate.predictions.create({
      version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
      input: {
        image: imageUrl,
        format: "png",
        reverse: false,
        threshold: 0,
        background_type: "rgba",
      },
      webhook: `${SUPABASE_URL}/functions/v1/replicate-webhook`,
      webhook_events_filter: ["completed"],
    });

    if (imageId) {
      await supabase
        .from("generated_images")
        .update({ status: 'processing', prediction_id: prediction.id })
        .eq('id', imageId);
    }

    return new Response(
      JSON.stringify({ predictionId: prediction.id, imageId, status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error removing background:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

### 5.4 `replicate-webhook/index.ts` (parte de imagens)

O webhook é compartilhado com outros sistemas. A parte relevante para imagens:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Replicate from "https://esm.sh/replicate@0.25.2";

const MAX_RETRIES = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      return new Response(JSON.stringify({ last_updated: "2025-11-13T10:08:00Z" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const webhookData = await req.json();

    const predictionId = webhookData.id;
    const status = webhookData.status;
    const output = webhookData.output;
    const error = webhookData.error;

    if (!predictionId) {
      return new Response(JSON.stringify({ error: "No prediction ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Buscar registro na tabela generated_images
    const { data: imageRecord } = await supabase
      .from("generated_images")
      .select("*")
      .eq("prediction_id", predictionId)
      .maybeSingle();

    if (!imageRecord) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Predição falhou
    if (status === "failed" || status === "canceled") {
      const isRetryableError = error && (
        error.includes("unexpected error handling prediction") ||
        error.includes("E6716") ||
        error.includes("Director:")
      );

      const currentRetryCount = imageRecord.retry_count || 0;

      // Auto-retry para erros transientes
      if (isRetryableError && currentRetryCount < MAX_RETRIES) {
        const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
        if (REPLICATE_API_KEY) {
          const replicate = new Replicate({ auth: REPLICATE_API_KEY });
          const requestParams = imageRecord.request_params || {};

          const newPrediction = await replicate.predictions.create({
            model: "google/nano-banana",
            input: {
              prompt: requestParams.prompt,
              image_input: requestParams.image_input || requestParams.imageUrls,
              aspect_ratio: requestParams.aspectRatio || "1:1",
              output_format: "png",
            },
            webhook: `${SUPABASE_URL}/functions/v1/replicate-webhook`,
            webhook_events_filter: ["completed"],
          });

          await supabase
            .from("generated_images")
            .update({
              prediction_id: newPrediction.id,
              status: "processing",
              retry_count: currentRetryCount + 1,
              error_message: null,
            })
            .eq("id", imageRecord.id);

          return new Response(JSON.stringify({ message: "Retry initiated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Marcar como falhou
      await supabase
        .from("generated_images")
        .update({
          status: "failed",
          error_message: error || "Prediction failed",
          prediction_id: null,
        })
        .eq("id", imageRecord.id);

      return new Response(JSON.stringify({ message: "Marked as failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Predição bem-sucedida
    if (status === "succeeded" && output) {
      const imageUrl = typeof output === "string" ? output : output[0];
      if (!imageUrl) throw new Error("No image URL in output");

      // Baixar a imagem
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error(`Failed to download image: ${imageResponse.statusText}`);

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();

      // Upload para Supabase Storage
      const fileName = `generated-${Date.now()}-${Math.random()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("plugin-images")
        .upload(fileName, imageBuffer, { contentType: "image/png", upsert: false });

      if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from("plugin-images").getPublicUrl(fileName);

      // Atualizar registro
      await supabase
        .from("generated_images")
        .update({
          status: "completed",
          image_url: publicUrl,
          error_message: null,
          prediction_id: null,
        })
        .eq("id", imageRecord.id);

      return new Response(JSON.stringify({ message: "Image processed successfully", url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Status received", status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

---

## 6. Config.toml

Adicionar ao `supabase/config.toml`:

```toml
[functions.replicate-webhook]
verify_jwt = false

[functions.generate-character-image]
verify_jwt = true

[functions.edit-character-image]
verify_jwt = true

[functions.remove-background]
verify_jwt = true
```

> **Importante**: O webhook precisa de `verify_jwt = false` pois o Replicate faz POST sem token JWT.

---

## 7. Secrets

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `REPLICATE_API_KEY` | API key do Replicate (replicate.com) | ✅ Sim |
| `SUPABASE_URL` | URL do projeto Supabase (auto-provido) | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (auto-provido) | Auto |

---

## 8. Componentes Frontend

### Arquivos necessários

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `src/pages/Efimagem.tsx` | ~1200 | Página principal com seleção de personagens, prompt, galeria, paginação, filtros, realtime |
| `src/components/CharactersModal.tsx` | ~647 | Modal admin para CRUD de personagens (add, edit, delete, upload imagens, set cover) |
| `src/components/ImageViewerModal.tsx` | ~439 | Modal de visualização com edição inline, remoção de background, histórico de versões |
| `src/components/ImageMaskEditor.tsx` | ~766 | Editor de máscaras com Konva.js (curvas Bézier + círculos) para modo "Brindes" |
| `src/components/SelectCharacterModal.tsx` | ~254 | Modal de seleção de personagem para uso em outros contextos (ex: banner AI) |

### Dependências npm

```bash
npm install react-konva konva
```

### Hooks (não há hook dedicado — lógica está nos componentes)

### Rota no Router

```tsx
<Route path="/efimagem" element={<Efimagem />} />
```

---

## 9. Prompt para LLM

Use este prompt para instruir outra LLM a recriar o sistema:

---

### Prompt de Recriação

```
Você precisa criar o sistema "Efimagem" — um gerador de imagens com personagens usando Replicate API (modelo google/nano-banana).

## Arquitetura

1. **4 tabelas no banco**: plugins, plugin_characters, character_images, generated_images
2. **4 Edge Functions (Deno)**: generate-character-image, edit-character-image, remove-background, replicate-webhook
3. **1 Storage bucket**: plugin-images (público)
4. **5 componentes React**: Efimagem.tsx (página), CharactersModal.tsx, ImageViewerModal.tsx, ImageMaskEditor.tsx, SelectCharacterModal.tsx

## Fluxo principal

1. Usuário seleciona personagem (com imagens de referência)
2. Digita prompt descrevendo pose/ação
3. Frontend chama `generate-character-image` via `supabase.functions.invoke()`
4. Edge function cria registro em `generated_images` (status: pending), envia para Replicate com webhook
5. Replicate processa e faz POST no `replicate-webhook`
6. Webhook baixa imagem, faz upload no Storage, atualiza registro (status: completed)
7. Frontend recebe atualização via Supabase Realtime e exibe a imagem

## Modelo Replicate

- Modelo: `google/nano-banana` (via `replicate.predictions.create()`)
- Input: `{ prompt, image_input: [urls], aspect_ratio, output_format: "png" }`
- Async com webhook (não polling)
- Auto-retry até 3x para erros transientes (E6716)

## Funcionalidades extras

- Edição de imagens geradas (re-prompting via edit-character-image)
- Remoção de background (modelo Replicate separado)
- Modo "Brindes" com editor de máscaras Konva.js (Bézier + círculos)
- Galeria com paginação, filtro por personagem, avatar do criador
- Realtime updates (INSERT, UPDATE, DELETE)

## SQL e dados

Execute os SQLs da seção 2 (tabelas) e seção 3 (dados) deste documento para criar a estrutura e popular com os 10 personagens e 45 imagens de referência.

## Secret necessário

- REPLICATE_API_KEY: obter em https://replicate.com/account/api-tokens
```

---

## Exportar imagens geradas (opcional)

Para exportar as 148 imagens geradas, execute:

```sql
SELECT id, character_name, prompt, image_url, status, created_at
FROM generated_images
WHERE status = 'completed'
ORDER BY created_at DESC;
```

E use os `image_url` para download em lote.
