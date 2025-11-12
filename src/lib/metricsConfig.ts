export const metricsConfig: Record<string, { label: string; metrics: string[] }> = {
  'Meta ads e Google ads': {
    label: 'Mídia Paga',
    metrics: [
      'CTR (Click Through Rate)',
      'CPC (Custo por Clique)',
      'CPA (Custo por Aquisição)',
      'CVR (Taxa de Conversão)',
      'Engajamento no anúncio',
      'Tempo médio de visualização'
    ]
  },
  'Marketing Cloud': {
    label: 'E-mail Marketing',
    metrics: [
      'Taxa de abertura',
      'CTR (clicks dentro do e-mail)',
      'CTO (Click to Open)',
      'Taxa de conversão',
      'Taxa de descadastro ou rejeição'
    ]
  },
  'Youtube insights': {
    label: 'YouTube / Vídeo Ads',
    metrics: [
      'View Rate (taxa de visualização)',
      'Retenção média',
      'CTR no vídeo',
      'CPV (Custo por visualização)',
      'Engajamento (likes, comentários)',
      'Conversões pós-view'
    ]
  },
  'Google Analytics': {
    label: 'Análise Web',
    metrics: [
      'Taxa de rejeição',
      'Tempo médio na página',
      'Páginas por sessão',
      'Taxa de conversão',
      'Eventos personalizados'
    ]
  },
  'Clarity': {
    label: 'Análise de Comportamento',
    metrics: [
      'Mapas de calor',
      'Gravações de sessão',
      'Taxa de cliques',
      'Dead clicks',
      'Rage clicks'
    ]
  }
};

export const getAvailableMetrics = (selectedTools: string[]): string[] => {
  const metrics = new Set<string>();
  
  selectedTools.forEach(tool => {
    if (metricsConfig[tool]) {
      metricsConfig[tool].metrics.forEach(metric => metrics.add(metric));
    }
  });
  
  return Array.from(metrics).sort();
};
