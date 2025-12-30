import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Sparkles, Lightbulb, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTest, useCreateTest, useUpdateTest } from "@/hooks/useTests";
import { TestStatus } from "@/types/test";
import { AttachmentsSection } from "@/components/tests/AttachmentsSection";
import { LinksSection } from "@/components/tests/LinksSection";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { getAvailableMetrics } from "@/lib/metricsConfig";
import { TestAIAssistantModal } from "@/components/tests/TestAIAssistantModal";
import { ExtractedTestData } from "@/hooks/useTestAIConversation";
import { toast } from "sonner";

const testTypes = ["A/B", "Usabilidade", "Design", "Conteúdo"];
const tools = [
  "Marketing Cloud",
  "Meta ads e Google ads",
  "Clarity",
  "Google Analytics",
  "Youtube insights",
];

const formSchema = z.object({
  nome_teste: z.string().min(1, "Nome é obrigatório"),
  hypothesis: z.string().min(1, "Hipótese é obrigatória"),
  insights: z.string().optional(),
  test_types: z.array(z.string()).min(1, "Selecione pelo menos um tipo"),
  tools: z.array(z.string()).min(1, "Selecione pelo menos uma ferramenta"),
  target_audience: z.string().optional(),
  tested_elements: z.string().optional(),
  success_metric: z.array(z.string()).default([]),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  status: z.enum(["planejamento", "execucao", "analise", "documentacao"]),
  attachments: z.array(z.any()).default([]),
  links: z.array(z.any()).default([]),
  created_by: z.string().optional(),
});

export default function TestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [aiModalOpen, setAIModalOpen] = useState(false);

  const { data: test } = useTest(id);
  const createTest = useCreateTest();
  const updateTest = useUpdateTest();

  // Buscar lista de perfis para o campo de autor
  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_teste: "",
      hypothesis: "",
      insights: "",
      test_types: [],
      tools: [],
      target_audience: "",
      tested_elements: "",
      success_metric: [],
      start_date: null,
      end_date: null,
      status: "planejamento",
      attachments: [],
      links: [],
    },
  });

  useEffect(() => {
    if (test) {
      form.reset({
        nome_teste: test.nome_teste,
        hypothesis: test.hypothesis,
        insights: test?.insights || "",
        test_types: test.test_types,
        tools: test.tools,
        target_audience: test.target_audience || "",
        tested_elements: test.tested_elements || "",
        success_metric: test.success_metric || [],
        start_date: test.start_date ? new Date(test.start_date) : null,
        end_date: test.end_date ? new Date(test.end_date) : null,
        status: test.status,
        attachments: test.attachments || [],
        links: test.links || [],
        created_by: test.created_by,
      });
    }
  }, [test, form]);

  // Abrir modal automaticamente para novos testes
  useEffect(() => {
    if (!isEditing) {
      setAIModalOpen(true);
    }
  }, [isEditing]);

  const currentStatus = form.watch("status");
  const selectedTools = form.watch("tools");
  const availableMetrics = getAvailableMetrics(selectedTools);
  const isReadOnly = false; // Allow editing in all statuses

  const handleAIFormFill = (data: ExtractedTestData) => {
    // Fill required fields
    if (data.nome_teste) form.setValue("nome_teste", data.nome_teste);
    if (data.hypothesis) form.setValue("hypothesis", data.hypothesis);
    if (data.test_types && data.test_types.length > 0) form.setValue("test_types", data.test_types);
    if (data.tools && data.tools.length > 0) form.setValue("tools", data.tools);

    // Fill optional fields
    if (data.target_audience) form.setValue("target_audience", data.target_audience);
    
    // Handle tested_elements - convert array to string if needed
    if (data.tested_elements) {
      const testedElementsValue = Array.isArray(data.tested_elements) 
        ? data.tested_elements.join(", ") 
        : data.tested_elements;
      form.setValue("tested_elements", testedElementsValue);
    }
    
    if (data.success_metric && data.success_metric.length > 0) {
      form.setValue("success_metric", data.success_metric);
    }
    if (data.start_date) {
      form.setValue("start_date", new Date(data.start_date));
    }
    if (data.end_date) {
      form.setValue("end_date", new Date(data.end_date));
    }
    if (data.insights) {
      form.setValue("insights", data.insights);
    }

    setAIModalOpen(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { created_by, ...restValues } = values;
    const data = {
      ...restValues,
      start_date: restValues.start_date ? format(restValues.start_date, "yyyy-MM-dd") : null,
      end_date: restValues.end_date ? format(restValues.end_date, "yyyy-MM-dd") : null,
      ...(isEditing && created_by ? { created_by } : {}),
    };

    try {
      if (isEditing && id) {
        await updateTest.mutateAsync({ id, ...data });
        // Small delay to ensure cache invalidation completes
        setTimeout(() => navigate("/tests/list"), 200);
      } else {
        await createTest.mutateAsync(data);
        navigate("/tests/list");
      }
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/tests/list")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Editar Teste" : "Novo Teste"}
          </h1>
        </div>

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
              name="nome_teste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Teste *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isReadOnly} />
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                      <SelectItem value="execucao">
                        Execução
                      </SelectItem>
                      <SelectItem value="analise">
                        Análise
                      </SelectItem>
                      <SelectItem value="documentacao">
                        Documentação
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isEditing && profiles && (
            <FormField
              control={form.control}
              name="created_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Autor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o autor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {(profile.full_name?.[0] || profile.email[0]).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {profile.full_name || profile.email}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="hypothesis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hipótese *</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Se [ação], então [resultado esperado], pois [justificativa]."
                    disabled={isReadOnly}
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="insights"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Insights e Recomendações
                </FormLabel>
                <FormControl>
                  {field.value ? (
                    <div 
                      className="min-h-[150px] p-4 rounded-md border border-yellow-200 bg-yellow-50/50 text-sm leading-relaxed prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: field.value }}
                    />
                  ) : (
                    <div className="min-h-[100px] p-4 rounded-md border border-dashed border-yellow-300 bg-yellow-50/30 flex items-center justify-center text-muted-foreground text-sm">
                      Os insights serão gerados automaticamente pelo assistente de IA
                    </div>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="test_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de teste *</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      options={testTypes}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione os tipos de teste"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tools"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ferramentas *</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      options={tools}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione as ferramentas"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Público-alvo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="novos usuários, leads do funil, clientes ativos"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tested_elements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Elementos testados</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="botão principal, mensagem de CTA, layout da tela"
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="success_metric"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Métricas de sucesso</FormLabel>
                <FormControl>
                  <MultiSelectCombobox
                    options={availableMetrics}
                    selected={field.value}
                    onChange={field.onChange}
                    placeholder={
                      selectedTools.length === 0 
                        ? "Selecione ferramentas primeiro" 
                        : "Selecione as métricas"
                    }
                    emptyText="Nenhuma métrica disponível para as ferramentas selecionadas"
                    disabled={isReadOnly || selectedTools.length === 0}
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground mt-1">
                  As métricas disponíveis variam de acordo com as ferramentas selecionadas
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de início</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isReadOnly}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={isReadOnly}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de fim</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isReadOnly}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={isReadOnly}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>



          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="extra-info">
              <AccordionTrigger>Informações extras</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                      <AttachmentsSection
                        attachments={field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="links"
                  render={({ field }) => (
                    <FormItem>
                      <LinksSection
                        links={field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormItem>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/tests/list")}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isReadOnly || createTest.isPending || updateTest.isPending}
            >
              {createTest.isPending || updateTest.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {isEditing ? "Atualizando" : "Criando"} teste...
                </>
              ) : (
                <>
                  {isEditing ? "Atualizar" : "Criar"} Teste
                </>
              )}
            </Button>
          </div>
        </form>
      </FormContainer>
      </Form>

      <TestAIAssistantModal
        open={aiModalOpen}
        onClose={() => setAIModalOpen(false)}
        onFormFill={handleAIFormFill}
        checkForDrafts={!isEditing}
      />
    </div>
  );
}
