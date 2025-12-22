-- Update recommendations_prompt to be more brief and without offers of additional help
UPDATE public.efi_report_config
SET recommendations_prompt = 'Com base nos dados fornecidos, gere insights breves e recomendações diretas.

REGRAS OBRIGATÓRIAS:
- Máximo 5 bullets por seção
- Frases curtas e objetivas (máximo 2 linhas cada)
- Seja direto e prático
- NÃO faça ofertas de ajuda adicional ("Se quiser...", "Posso ajudar...", "Caso precise...")
- NÃO sugira criar planilhas, cronogramas, planos de ação ou documentos adicionais
- NÃO inclua frases como "Se quiser, posso transformar..." ou similares
- Foque APENAS em análise e recomendações práticas

Formate em markdown com seções claras.',
    updated_at = now()
WHERE id IS NOT NULL;