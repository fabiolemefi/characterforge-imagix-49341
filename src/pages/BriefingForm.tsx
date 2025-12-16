import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormContainer,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles } from "lucide-react";
import { useBriefing, useCreateBriefing, useUpdateBriefing } from "@/hooks/useBriefings";
import { BriefingAIAssistantModal } from "@/components/briefings/BriefingAIAssistantModal";
import { ExtractedTestData } from "@/hooks/useTestAIConversation";

const formSchema = z.object({
  status: z.enum(["rascunho", "em_revisao", "aprovado", "concluido"]),
  objetivo_final: z.string().min(1, "Objetivo final é obrigatório"),
  acao_desejada: z.string().min(1, "Ação desejada é obrigatória"),
  tela_destino: z.string().min(1, "Tela destino é obrigatória"),
  motivo_demanda: z.string().min(1, "Motivo da demanda é obrigatório"),
  conexao_com_estrategia: z.string().min(1, "Conexão com estratégia é obrigatória"),
  metrica_de_negocio: z.string().min(1, "Métrica de negócio é obrigatória"),
  desafios_comerciais: z.string().min(1, "Desafios comerciais é obrigatório"),
  prioridade_urgencia: z.string().min(1, "Prioridade/urgência é obrigatória"),
  tipo_usuario: z.string().min(1, "Tipo de usuário é obrigatório"),
  publico: z.string().min(1, "Público é obrigatório"),
  modalidade_conta: z.string().min(1, "Modalidade da conta é obrigatória"),
  base_manual_ou_automatica: z.string().min(1, "Base manual ou automática é obrigatória"),
  volume_estimado: z.string().optional(),
  dados_relevantes: z.string().optional(),
  oferta_incentivo: z.string().optional(),
  condicoes_especiais: z.string().optional(),
  validade_datas: z.string().optional(),
  perfil: z.string().optional(),
  dores: z.string().optional(),
  desafios: z.string().optional(),
  comportamento: z.string().optional(),
  etapa_jornada: z.string().optional(),
  conexao_com_outras_acoes: z.string().optional(),
  contexto_produto: z.string().optional(),
  links_figma: z.string().optional(),
});

export default function BriefingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [aiModalOpen, setAIModalOpen] = useState(false);

  const { data: briefing } = useBriefing(id);
  const createBriefing = useCreateBriefing();
  const updateBriefing = useUpdateBriefing();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "rascunho",
      objetivo_final: "",
      acao_desejada: "",
      tela_destino: "",
      motivo_demanda: "",
      conexao_com_estrategia: "",
      metrica_de_negocio: "",
      desafios_comerciais: "",
      prioridade_urgencia: "",
      tipo_usuario: "",
      publico: "",
      modalidade_conta: "",
      base_manual_ou_automatica: "",
      volume_estimado: "",
      dados_relevantes: "",
      oferta_incentivo: "",
      condicoes_especiais: "",
      validade_datas: "",
      perfil: "",
      dores: "",
      desafios: "",
      comportamento: "",
      etapa_jornada: "",
      conexao_com_outras_acoes: "",
      contexto_produto: "",
      links_figma: "",
    },
  });

  useEffect(() => {
    if (briefing) {
      form.reset({
        status: briefing.status,
        objetivo_final: briefing.objetivo_final,
        acao_desejada: briefing.acao_desejada,
        tela_destino: briefing.tela_destino,
        motivo_demanda: briefing.motivo_demanda,
        conexao_com_estrategia: briefing.conexao_com_estrategia,
        metrica_de_negocio: briefing.metrica_de_negocio,
        desafios_comerciais: briefing.desafios_comerciais,
        prioridade_urgencia: briefing.prioridade_urgencia,
        tipo_usuario: briefing.tipo_usuario,
        publico: briefing.publico,
        modalidade_conta: briefing.modalidade_conta,
        base_manual_ou_automatica: briefing.base_manual_ou_automatica,
        volume_estimado: briefing.volume_estimado || "",
        dados_relevantes: briefing.dados_relevantes || "",
        oferta_incentivo: briefing.oferta_incentivo || "",
        condicoes_especiais: briefing.condicoes_especiais || "",
        validade_datas: briefing.validade_datas || "",
        perfil: briefing.perfil || "",
        dores: briefing.dores || "",
        desafios: briefing.desafios || "",
        comportamento: briefing.comportamento || "",
        etapa_jornada: briefing.etapa_jornada || "",
        conexao_com_outras_acoes: briefing.conexao_com_outras_acoes || "",
        contexto_produto: briefing.contexto_produto || "",
        links_figma: briefing.links_figma || "",
      });
    }
  }, [briefing, form]);

  // Abrir modal automaticamente para novos briefings
  useEffect(() => {
    if (!isEditing) {
      setAIModalOpen(true);
    }
  }, [isEditing]);

  const handleAIFormFill = (data: ExtractedTestData) => {
    // Map extracted data to form fields
    const fieldMapping: Record<string, string> = {
      objetivo_final: "objetivo_final",
      acao_desejada: "acao_desejada",
      tela_destino: "tela_destino",
      motivo_demanda: "motivo_demanda",
      conexao_com_estrategia: "conexao_com_estrategia",
      metrica_de_negocio: "metrica_de_negocio",
      desafios_comerciais: "desafios_comerciais",
      prioridade_urgencia: "prioridade_urgencia",
      tipo_usuario: "tipo_usuario",
      publico: "publico",
      modalidade_conta: "modalidade_conta",
      base_manual_ou_automatica: "base_manual_ou_automatica",
      volume_estimado: "volume_estimado",
      dados_relevantes: "dados_relevantes",
      oferta_incentivo: "oferta_incentivo",
      condicoes_especiais: "condicoes_especiais",
      validade_datas: "validade_datas",
      perfil: "perfil",
      dores: "dores",
      desafios: "desafios",
      comportamento: "comportamento",
      etapa_jornada: "etapa_jornada",
      conexao_com_outras_acoes: "conexao_com_outras_acoes",
      contexto_produto: "contexto_produto",
      links_figma: "links_figma",
    };

    Object.entries(data).forEach(([key, value]) => {
      if (fieldMapping[key] && value) {
        form.setValue(fieldMapping[key] as any, value as string);
      }
    });

    setAIModalOpen(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditing && id) {
        await updateBriefing.mutateAsync({ id, ...values });
        setTimeout(() => navigate("/briefings/list"), 200);
      } else {
        await createBriefing.mutateAsync(values);
        navigate("/briefings/list");
      }
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isEditing ? "Editar Briefing" : "Novo Briefing"}
        </h1>

        {!isEditing && (
          <Button
            variant="outline"
            onClick={() => setAIModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Assistente de IA
          </Button>
        )}
      </div>

      <Form {...form}>
        <FormContainer>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="objetivo_final"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Objetivo Final *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="em_revisao">Em Revisão</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prioridade_urgencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade/Urgência *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acao_desejada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ação Desejada *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tela_destino"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tela Destino *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_usuario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="motivo_demanda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Demanda *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modalidade_conta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade da Conta *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="conexao_com_estrategia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conexão com Estratégia *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="metrica_de_negocio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Métrica de Negócio *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_manual_ou_automatica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Manual ou Automática *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="desafios_comerciais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desafios Comerciais *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="optional-fields">
                <AccordionTrigger>Campos Opcionais</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="volume_estimado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volume Estimado</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="validade_datas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validade/Datas</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dados_relevantes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dados Relevantes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="oferta_incentivo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Oferta/Incentivo</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condicoes_especiais"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condições Especiais</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="perfil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Perfil</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="etapa_jornada"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Etapa da Jornada</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dores"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dores</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="desafios"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desafios</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comportamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comportamento</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conexao_com_outras_acoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conexão com Outras Ações</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contexto_produto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contexto do Produto</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="links_figma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Links do Figma</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://figma.com/..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/briefings/list")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createBriefing.isPending || updateBriefing.isPending}>
                {isEditing ? "Salvar" : "Criar Briefing"}
              </Button>
            </div>
          </form>
        </FormContainer>
      </Form>

      <BriefingAIAssistantModal
        open={aiModalOpen}
        onClose={() => setAIModalOpen(false)}
        onFormFill={handleAIFormFill}
        checkForDrafts={false}
      />
    </div>
  );
}
