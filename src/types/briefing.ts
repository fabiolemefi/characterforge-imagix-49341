export type BriefingStatus = "rascunho" | "em_revisao" | "aprovado" | "concluido";

export interface Briefing {
  id: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  status: BriefingStatus;
  
  // Campos obrigatórios
  objetivo_final: string;
  acao_desejada: string;
  tela_destino: string;
  motivo_demanda: string;
  conexao_com_estrategia: string;
  metrica_de_negocio: string;
  desafios_comerciais: string;
  prioridade_urgencia: string;
  tipo_usuario: string;
  publico: string;
  modalidade_conta: string;
  base_manual_ou_automatica: string;
  
  // Campos opcionais
  volume_estimado: string | null;
  dados_relevantes: string | null;
  oferta_incentivo: string | null;
  condicoes_especiais: string | null;
  validade_datas: string | null;
  perfil: string | null;
  dores: string | null;
  desafios: string | null;
  comportamento: string | null;
  etapa_jornada: string | null;
  conexao_com_outras_acoes: string | null;
  contexto_produto: string | null;
  links_figma: string | null;
  
  // Extras
  attachments: any[];
  links: any[];
  
  // Joined profile data
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}
