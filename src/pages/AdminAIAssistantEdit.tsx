import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot, ArrowLeft, Save, Play } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIAssistant, useCreateAIAssistant, useUpdateAIAssistant, AIAssistant } from "@/hooks/useAIAssistants";
import { TestAIAssistantModal } from "@/components/tests/TestAIAssistantModal";

const DEFAULT_MODEL_CONFIG = {
  model: "gpt-4-turbo-preview",
  temperature: 1.1,
  max_tokens: 2500,
  top_p: 0.95,
  frequency_penalty: 0.3,
  presence_penalty: 0.2,
};

const AVAILABLE_MODELS = [
  { value: "gpt-4-turbo-preview", label: "GPT-4 Turbo Preview" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

export default function AdminAIAssistantEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  
  const { data: assistant, isLoading } = useAIAssistant(isNew ? undefined : id);
  const createAssistant = useCreateAIAssistant();
  const updateAssistant = useUpdateAIAssistant();
  
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<AIAssistant>>({
    name: "",
    slug: "",
    description: "",
    system_prompt: "",
    greeting_message: "",
    ready_message: "",
    model_config: DEFAULT_MODEL_CONFIG,
    fields_schema: [],
    is_active: true,
  });

  useEffect(() => {
    if (assistant) {
      setFormData({
        name: assistant.name,
        slug: assistant.slug,
        description: assistant.description || "",
        system_prompt: assistant.system_prompt,
        greeting_message: assistant.greeting_message || "",
        ready_message: assistant.ready_message || "",
        model_config: assistant.model_config || DEFAULT_MODEL_CONFIG,
        fields_schema: assistant.fields_schema || [],
        is_active: assistant.is_active,
      });
    }
  }, [assistant]);

  const handleSave = async () => {
    if (isNew) {
      await createAssistant.mutateAsync({
        name: formData.name!,
        slug: formData.slug!,
        description: formData.description,
        system_prompt: formData.system_prompt!,
        greeting_message: formData.greeting_message,
        ready_message: formData.ready_message,
        model_config: formData.model_config,
        fields_schema: formData.fields_schema,
        is_active: formData.is_active,
      });
      navigate("/admin/ai-assistants");
    } else {
      await updateAssistant.mutateAsync({
        id: id!,
        ...formData,
      });
    }
  };

  const updateModelConfig = (key: string, value: number | string) => {
    setFormData((prev) => ({
      ...prev,
      model_config: {
        ...prev.model_config!,
        [key]: value,
      },
    }));
  };

  if (isLoading && !isNew) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 p-8">
            <Skeleton className="h-8 w-64 mb-8" />
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-4 mb-8">
            <SidebarTrigger />
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/ai-assistants")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">
                {isNew ? "Novo Assistente" : formData.name}
              </h1>
            </div>
            <div className="ml-auto flex gap-2">
              {!isNew && (
                <Button variant="outline" onClick={() => setTestModalOpen(true)}>
                  <Play className="h-4 w-4 mr-2" />
                  Testar
                </Button>
              )}
              <Button 
                onClick={handleSave}
                disabled={createAssistant.isPending || updateAssistant.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList>
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="model">Modelo</TabsTrigger>
              <TabsTrigger value="fields">Campos</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                  <CardDescription>
                    Configurações básicas do assistente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Criação de Testes A/B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="Ex: test-creation"
                      />
                      <p className="text-xs text-muted-foreground">
                        Identificador único usado no código
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o propósito deste assistente..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Assistente Ativo</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompt">
              <Card>
                <CardHeader>
                  <CardTitle>System Prompt</CardTitle>
                  <CardDescription>
                    O prompt principal que define o comportamento do assistente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    placeholder="Digite o system prompt..."
                    className="font-mono text-sm min-h-[500px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Caracteres: {formData.system_prompt?.length || 0}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="model">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração do Modelo</CardTitle>
                  <CardDescription>
                    Parâmetros do modelo GPT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select
                      value={formData.model_config?.model}
                      onValueChange={(value) => updateModelConfig("model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Temperature: {formData.model_config?.temperature}</Label>
                    <Slider
                      value={[formData.model_config?.temperature || 1]}
                      onValueChange={([value]) => updateModelConfig("temperature", value)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Controla a criatividade (0 = determinístico, 2 = muito criativo)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens: {formData.model_config?.max_tokens}</Label>
                    <Slider
                      value={[formData.model_config?.max_tokens || 2500]}
                      onValueChange={([value]) => updateModelConfig("max_tokens", value)}
                      min={100}
                      max={4000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite máximo de tokens na resposta
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Top P: {formData.model_config?.top_p}</Label>
                    <Slider
                      value={[formData.model_config?.top_p || 0.95]}
                      onValueChange={([value]) => updateModelConfig("top_p", value)}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Frequency Penalty: {formData.model_config?.frequency_penalty}</Label>
                    <Slider
                      value={[formData.model_config?.frequency_penalty || 0.3]}
                      onValueChange={([value]) => updateModelConfig("frequency_penalty", value)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Penaliza palavras repetidas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Presence Penalty: {formData.model_config?.presence_penalty}</Label>
                    <Slider
                      value={[formData.model_config?.presence_penalty || 0.2]}
                      onValueChange={([value]) => updateModelConfig("presence_penalty", value)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Incentiva novos tópicos
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields">
              <Card>
                <CardHeader>
                  <CardTitle>Schema de Campos</CardTitle>
                  <CardDescription>
                    Define os campos que o assistente deve coletar (formato JSON)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={JSON.stringify(formData.fields_schema, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({ ...formData, fields_schema: parsed });
                      } catch {
                        // Allow invalid JSON while editing
                      }
                    }}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="[]"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Mensagens Padrão</CardTitle>
                  <CardDescription>
                    Mensagens de saudação e conclusão
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="greeting">Mensagem de Saudação</Label>
                    <Textarea
                      id="greeting"
                      value={formData.greeting_message || ""}
                      onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                      placeholder="Olá! Como posso ajudar você hoje?"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Primeira mensagem enviada ao usuário
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ready">Mensagem de Conclusão</Label>
                    <Textarea
                      id="ready"
                      value={formData.ready_message || ""}
                      onChange={(e) => setFormData({ ...formData, ready_message: e.target.value })}
                      placeholder="Perfeito! Tenho todas as informações necessárias."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mensagem quando o assistente coleta todos os dados
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {!isNew && formData.slug && (
            <TestAIAssistantModal
              open={testModalOpen}
              onClose={() => setTestModalOpen(false)}
              onFormFill={() => {}}
              checkForDrafts={false}
            />
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
