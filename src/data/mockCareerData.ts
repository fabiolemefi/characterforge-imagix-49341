export interface CareerNode {
  id: string;
  name: string;
  department: string;
  level: number;
  description: string;
  requirements: string[];
}

export interface CareerLink {
  source: string;
  target: string;
}

export interface CareerGraphData {
  nodes: CareerNode[];
  links: CareerLink[];
}

export const departmentColors: Record<string, string> = {
  'Comercial': '#e74c3c',
  'TI': '#1abc9c',
  'RH': '#9b59b6',
  'Financeiro': '#f39c12',
  'Administrativo': '#3498db',
  'Operacional': '#2ecc71',
};

export const mockNodes: CareerNode[] = [
  // Comercial
  { id: '1', name: 'Estagiário Comercial', department: 'Comercial', level: 1, description: 'Início da carreira na área comercial. Apoio em atividades administrativas e acompanhamento de vendas.', requirements: ['Cursando graduação em Administração, Marketing ou áreas afins', 'Conhecimento básico em Pacote Office'] },
  { id: '2', name: 'Assistente Comercial', department: 'Comercial', level: 2, description: 'Apoio direto à equipe de vendas, elaboração de propostas e atendimento a clientes.', requirements: ['Graduação completa', 'Excel intermediário', '6 meses de experiência'] },
  { id: '3', name: 'Analista Comercial Jr', department: 'Comercial', level: 2, description: 'Análise de dados de vendas, elaboração de relatórios e suporte à tomada de decisão.', requirements: ['1 ano de experiência', 'Excel avançado', 'Conhecimento em CRM'] },
  { id: '4', name: 'Analista Comercial Pleno', department: 'Comercial', level: 3, description: 'Gestão de carteira de clientes, análises complexas de mercado e proposição de estratégias.', requirements: ['3 anos de experiência', 'Power BI', 'Negociação'] },
  { id: '5', name: 'Analista Comercial Sênior', department: 'Comercial', level: 4, description: 'Liderança técnica da equipe, definição de metodologias e mentoria de analistas júnior.', requirements: ['5 anos de experiência', 'Liderança técnica', 'Visão estratégica'] },
  { id: '6', name: 'Coordenador Comercial', department: 'Comercial', level: 4, description: 'Gestão de equipe comercial, definição de metas e acompanhamento de resultados.', requirements: ['Experiência em gestão de pessoas', 'Planejamento estratégico', '5 anos na área'] },
  { id: '7', name: 'Gerente Comercial', department: 'Comercial', level: 5, description: 'Gestão estratégica da área comercial, definição de políticas e representação junto à diretoria.', requirements: ['MBA ou Pós-graduação', '8 anos de experiência', 'Gestão de P&L'] },

  // TI
  { id: '8', name: 'Estagiário TI', department: 'TI', level: 1, description: 'Suporte às atividades de desenvolvimento e infraestrutura. Aprendizado das tecnologias utilizadas.', requirements: ['Cursando Ciência da Computação ou áreas afins', 'Lógica de programação'] },
  { id: '9', name: 'Dev Júnior', department: 'TI', level: 2, description: 'Desenvolvimento de funcionalidades sob supervisão, correção de bugs e testes.', requirements: ['Conhecimento em React ou Angular', 'Git', 'SQL básico'] },
  { id: '10', name: 'Dev Pleno', department: 'TI', level: 3, description: 'Desenvolvimento autônomo de features, code review e documentação técnica.', requirements: ['3 anos de experiência', 'Arquitetura de software', 'APIs REST'] },
  { id: '11', name: 'Dev Sênior', department: 'TI', level: 4, description: 'Liderança técnica, definição de arquitetura e mentoria de desenvolvedores.', requirements: ['5 anos de experiência', 'Design Patterns', 'Cloud (AWS/GCP)'] },
  { id: '12', name: 'Tech Lead', department: 'TI', level: 4, description: 'Coordenação técnica do time, decisões de arquitetura e interface com stakeholders.', requirements: ['Liderança técnica', 'Comunicação', 'Gestão de projetos ágeis'] },
  { id: '13', name: 'Gerente de TI', department: 'TI', level: 5, description: 'Gestão da área de tecnologia, orçamento, contratações e estratégia de TI.', requirements: ['MBA em Gestão de TI', '8 anos de experiência', 'Gestão de equipes'] },

  // RH
  { id: '14', name: 'Assistente RH', department: 'RH', level: 2, description: 'Apoio em processos de recrutamento, admissão e folha de pagamento.', requirements: ['Graduação em RH ou Psicologia', 'Pacote Office'] },
  { id: '15', name: 'Analista RH', department: 'RH', level: 3, description: 'Condução de processos seletivos, treinamentos e gestão de benefícios.', requirements: ['2 anos de experiência', 'Técnicas de entrevista', 'Legislação trabalhista'] },
  { id: '16', name: 'BP de RH', department: 'RH', level: 4, description: 'Parceiro estratégico das áreas de negócio, consultoria interna e gestão de clima.', requirements: ['5 anos de experiência', 'Consultoria interna', 'Gestão de mudanças'] },
  { id: '17', name: 'Gerente RH', department: 'RH', level: 5, description: 'Gestão estratégica de pessoas, cultura organizacional e desenvolvimento.', requirements: ['Pós-graduação', '8 anos de experiência', 'Liderança'] },

  // Financeiro
  { id: '18', name: 'Assistente Financeiro', department: 'Financeiro', level: 2, description: 'Apoio em contas a pagar/receber, conciliação bancária e lançamentos.', requirements: ['Graduação em Contabilidade ou afins', 'Excel'] },
  { id: '19', name: 'Analista Financeiro', department: 'Financeiro', level: 3, description: 'Análise de fluxo de caixa, relatórios financeiros e planejamento orçamentário.', requirements: ['3 anos de experiência', 'Excel avançado', 'ERP'] },
  { id: '20', name: 'Coordenador Financeiro', department: 'Financeiro', level: 4, description: 'Gestão da equipe financeira, fechamento mensal e interface com auditoria.', requirements: ['5 anos de experiência', 'Liderança', 'Contabilidade gerencial'] },
  { id: '21', name: 'Gerente Financeiro', department: 'Financeiro', level: 5, description: 'Gestão estratégica financeira, relacionamento com bancos e investidores.', requirements: ['MBA em Finanças', 'Planejamento estratégico', 'M&A'] },
];

export const mockLinks: CareerLink[] = [
  // Trilha Comercial
  { source: '1', target: '2' },   // Estagiário → Assistente
  { source: '1', target: '3' },   // Estagiário → Analista Jr
  { source: '2', target: '3' },   // Assistente → Analista Jr
  { source: '2', target: '4' },   // Assistente → Analista Pleno
  { source: '3', target: '4' },   // Analista Jr → Pleno
  { source: '4', target: '5' },   // Pleno → Sênior
  { source: '4', target: '6' },   // Pleno → Coordenador (gestão)
  { source: '5', target: '6' },   // Sênior → Coordenador
  { source: '5', target: '7' },   // Sênior → Gerente (técnico)
  { source: '6', target: '7' },   // Coordenador → Gerente

  // Trilha TI
  { source: '8', target: '9' },   // Estagiário → Dev Jr
  { source: '9', target: '10' },  // Dev Jr → Pleno
  { source: '10', target: '11' }, // Pleno → Sênior
  { source: '10', target: '12' }, // Pleno → Tech Lead (gestão)
  { source: '11', target: '12' }, // Sênior → Tech Lead
  { source: '11', target: '13' }, // Sênior → Gerente
  { source: '12', target: '13' }, // Tech Lead → Gerente

  // Trilha RH
  { source: '14', target: '15' }, // Assistente → Analista
  { source: '15', target: '16' }, // Analista → BP
  { source: '16', target: '17' }, // BP → Gerente

  // Trilha Financeiro
  { source: '18', target: '19' }, // Assistente → Analista
  { source: '19', target: '20' }, // Analista → Coordenador
  { source: '20', target: '21' }, // Coordenador → Gerente

  // Conexões entre áreas (movimentações laterais)
  { source: '4', target: '19' },  // Analista Comercial Pleno → Analista Financeiro
  { source: '15', target: '6' },  // Analista RH → Coordenador Comercial (transição para gestão)
];

export const mockCareerData: CareerGraphData = {
  nodes: mockNodes,
  links: mockLinks,
};
