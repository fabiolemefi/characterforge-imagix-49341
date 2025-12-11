import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ExtractedTestData {
  nome_teste?: string | null;
  hypothesis?: string | null;
  insights?: string | null;
  test_types?: string[];
  tools?: string[];
  target_audience?: string | null;
  tested_elements?: string | null;
  success_metric?: string[];
  start_date?: string | null;
  end_date?: string | null;
  [key: string]: any; // Allow dynamic fields for different assistants
}

export interface FieldSchema {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface AIResponse {
  message: string;
  status: "collecting" | "ready";
  extracted_data: ExtractedTestData;
  next_question?: string;
}

export function useTestAIConversation(assistantSlug: string = "test-creation") {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTestData>({});
  const [isReady, setIsReady] = useState(false);
  const [pendingPredictionId, setPendingPredictionId] = useState<string | null>(null);
  const [fieldsSchema, setFieldsSchema] = useState<FieldSchema[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Clear loading when message arrives and prediction is complete
  useEffect(() => {
    if (pendingPredictionId === null && isLoading && messages.length > 0) {
      // Check if the last message is from assistant (meaning AI responded)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        console.log("⏹️ Clearing loading state - AI response received");
        setIsLoading(false);
        setPendingPredictionId(null);
      }
    }
  }, [messages, pendingPredictionId, isLoading]);

  // Setup realtime listener when conversation is loaded
  useEffect(() => {
    if (!conversationId) return;

    console.log("Setting up realtime for conversation:", conversationId);

    // Create channel for this specific conversation
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "test_ai_conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("🔄 Realtime update received:", payload);
          const newData = payload.new as {
            messages?: Message[];
            extracted_data?: ExtractedTestData;
            status?: string;
            prediction_id?: string | null;
          };
          
          // Update local state with new data from database
          if (newData.messages) {
            console.log("📝 Updating messages, count:", newData.messages.length);
            // Force new array reference to ensure React detects the change
            setMessages([...newData.messages]);
          }
          if (newData.extracted_data) {
            console.log("📊 Updating extracted data:", newData.extracted_data);
            setExtractedData(newData.extracted_data);
          }
          if (newData.status === "ready" || newData.status === "completed") {
            console.log("✅ Status is ready!");
            setIsReady(true);
          }
          
          // Update pending prediction ID (don't stop polling - it must continue for the entire conversation)
          if (newData.prediction_id !== undefined) {
            setPendingPredictionId(newData.prediction_id);
            if (newData.prediction_id === null) {
              console.log("⏹️ Prediction completed, clearing timeout only");
              // Clear timeout only, keep polling active
              if ((window as any).__aiTimeoutId) {
                clearTimeout((window as any).__aiTimeoutId);
                (window as any).__aiTimeoutId = null;
              }
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Setup polling to check for updates every second (fallback if realtime fails)
    // IMPORTANT: Polling must continue for the entire conversation lifecycle
    const pollingInterval = setInterval(async () => {
      if (!conversationId) return;
      
      console.log("🔄 [polling] Verificando atualizações...");
      
      try {
        const { data, error } = await supabase
          .from("test_ai_conversations")
          .select("*")
          .eq("id", conversationId)
          .single();

        if (error) throw error;
        if (!data) return;

        // Update state with latest data - only if more messages than local (avoid race condition)
        if (data.messages && Array.isArray(data.messages) && data.messages.length > messages.length) {
          console.log("🔄 [polling] Atualizando mensagens:", data.messages.length, "vs local:", messages.length);
          setMessages(data.messages as unknown as Message[]);
        }
        if (data.extracted_data) {
          setExtractedData(data.extracted_data as unknown as ExtractedTestData);
        }
        if (data.status === "ready") {
          setIsReady(true);
        }
        if (data.prediction_id !== undefined) {
          setPendingPredictionId(data.prediction_id);
          if (data.prediction_id === null) {
            console.log("Polling: Prediction completed, clearing timeout only");
            // Clear timeout only, keep polling active for future messages
            if ((window as any).__aiTimeoutId) {
              clearTimeout((window as any).__aiTimeoutId);
              (window as any).__aiTimeoutId = null;
            }
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1000); // Check every second
    
    (window as any).__aiPollingId = pollingInterval;

    // Cleanup on unmount or when conversationId changes
    return () => {
      console.log("Cleaning up realtime channel and polling");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if ((window as any).__aiPollingId) {
        clearInterval((window as any).__aiPollingId);
        (window as any).__aiPollingId = null;
      }
    };
  }, [conversationId]);

  // Check for existing draft conversation
  const checkForDraft = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("test_ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      return data?.id || null;
    } catch (error) {
      console.error("Erro ao verificar rascunho:", error);
      return null;
    }
  };

  // Load existing conversation
  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("test_ai_conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Conversa não encontrada");

      setConversationId(data.id);
      setMessages((data.messages as unknown) as Message[]);
      setExtractedData((data.extracted_data as unknown) as ExtractedTestData);
      setIsReady(data.status === "ready");

      console.log("Conversa carregada:", data.id);
    } catch (error: any) {
      console.error("Erro ao carregar conversa:", error);
      toast.error("Erro ao carregar conversa");
    } finally {
      setIsLoading(false);
    }
  };

  // Start new conversation
  const startConversation = async (): Promise<string | null> => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch the assistant's fields_schema
      const { data: assistantData, error: assistantError } = await supabase
        .from("ai_assistants")
        .select("fields_schema")
        .eq("slug", assistantSlug)
        .single();

      if (assistantError) {
        console.error("Erro ao buscar assistente:", assistantError);
      } else if (assistantData?.fields_schema) {
        console.log("📋 Fields schema loaded:", assistantData.fields_schema);
        setFieldsSchema(assistantData.fields_schema as unknown as FieldSchema[]);
      }

      // Create initial conversation in database
      const { data, error } = await supabase
        .from("test_ai_conversations")
        .insert({
          user_id: user.id,
          messages: [],
          extracted_data: {},
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Erro ao criar conversa");

      const newConversationId = data.id;
      setConversationId(newConversationId);
      setMessages([]);
      setExtractedData({});
      setIsReady(false);

      console.log("Nova conversa criada:", newConversationId);

      // Get initial greeting from AI with the new conversation ID
      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-test-ai", {
        body: {
          messages: [],
          conversationId: newConversationId,
          assistantSlug: assistantSlug,
        },
      });

      if (aiError) throw aiError;
      if (!aiData) throw new Error("Nenhuma resposta da IA");

      const aiResponse: AIResponse = aiData;

      // Add AI greeting message
      const aiMessage: Message = {
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
      };
      setMessages([aiMessage]);
      setExtractedData(aiResponse.extracted_data);

      // Update conversation in database
      const { error: updateError } = await supabase
        .from("test_ai_conversations")
        .update({
          messages: [aiMessage] as unknown as any,
          extracted_data: aiResponse.extracted_data as unknown as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", newConversationId);

      if (updateError) throw updateError;

      return newConversationId;
    } catch (error: any) {
      console.error("Erro ao iniciar conversa:", error);
      toast.error("Erro ao iniciar conversa");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to AI
  const sendMessage = async (content: string, isGreeting = false) => {
    if (!conversationId && !isGreeting) {
      toast.error("Conversa não iniciada");
      return;
    }

    try {
      setIsLoading(true);
      console.log("📤 Iniciando envio de mensagem...", { contentLength: content.length, conversationId });

      // Add user message to state and database immediately
      let updatedMessages = [...messages];
      if (!isGreeting && content.trim()) {
        const userMessage: Message = {
          role: "user",
          content: content.trim(),
          timestamp: new Date().toISOString(),
        };
        updatedMessages = [...updatedMessages, userMessage];
        setMessages(updatedMessages);

        // Save user message to database immediately
        await supabase
          .from("test_ai_conversations")
          .update({
            messages: updatedMessages as unknown as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }

      console.log("📡 [sendMessage] Chamando Edge Function...", { 
        messagesCount: updatedMessages.length,
        conversationId 
      });

      // Timeout promise que REJEITA corretamente
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error("⏰ [sendMessage] TIMEOUT após 60 segundos");
          reject(new Error("Timeout: A IA demorou muito para responder."));
        }, 60000);
      });

      // Promise da requisição
      const responsePromise = supabase.functions.invoke("generate-test-ai", {
        body: {
          messages: updatedMessages,
          conversationId: conversationId,
          assistantSlug: assistantSlug,
        },
      });

      // Race correta entre timeout e resposta
      let aiData: any;
      let aiError: any;
      
      try {
        const result = await Promise.race([responsePromise, timeoutPromise]);
        aiData = result.data;
        aiError = result.error;
        console.log("📥 [sendMessage] Resposta recebida:", { 
          hasData: !!aiData, 
          hasError: !!aiError,
          status: aiData?.status 
        });
      } catch (raceError) {
        console.error("❌ [sendMessage] Race error:", raceError);
        throw raceError;
      }

      if (aiError) throw aiError;
      if (!aiData) throw new Error("Nenhuma resposta da IA");

      // Process the AI response directly
      const aiResponse = aiData;

      // Add AI message to local state
      const aiMessage: Message = {
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setExtractedData(aiResponse.extracted_data);
      setIsReady(aiResponse.status === "ready");

      console.log("✅ [sendMessage] Sucesso! setIsLoading(false)");
    } catch (error: any) {
      console.error("❌ [sendMessage] Erro:", error);
      toast.error(error.message || "Erro ao enviar mensagem");
      setPendingPredictionId(null);
    } finally {
      // SEMPRE reseta o loading
      console.log("🏁 [sendMessage] Finally block - resetando loading");
      setIsLoading(false);
    }
  };

  // Mark conversation as completed
  const completeConversation = async (testId: string) => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from("test_ai_conversations")
        .update({
          test_id: testId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (error) throw error;

      console.log("Conversa concluída:", conversationId);
    } catch (error: any) {
      console.error("Erro ao concluir conversa:", error);
    }
  };

  // Abandon conversation
  const abandonConversation = async () => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from("test_ai_conversations")
        .update({
          status: "abandoned",
        })
        .eq("id", conversationId);

      if (error) throw error;

      console.log("Conversa abandonada:", conversationId);
    } catch (error: any) {
      console.error("Erro ao abandonar conversa:", error);
    }
  };

  // Delete conversation
  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("test_ai_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      console.log("Conversa deletada:", id);
    } catch (error: any) {
      console.error("Erro ao deletar conversa:", error);
    }
  };

  // Cancel loading state manually
  const cancelLoading = () => {
    console.log("🛑 Loading cancelado pelo usuário");
    setIsLoading(false);
    setPendingPredictionId(null);
    toast.info("Operação cancelada. Você pode tentar novamente.");
  };

  // Reset conversation state
  const resetConversation = () => {
    console.log("🔄 Resetting conversation state");
    setConversationId(null);
    setMessages([]);
    setExtractedData({});
    setIsReady(false);
    setIsLoading(false);
    setPendingPredictionId(null);
    setFieldsSchema([]);
    
    // Cleanup realtime channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Clear any polling/timeout
    if ((window as any).__aiPollingId) {
      clearInterval((window as any).__aiPollingId);
      (window as any).__aiPollingId = null;
    }
    if ((window as any).__aiTimeoutId) {
      clearTimeout((window as any).__aiTimeoutId);
      (window as any).__aiTimeoutId = null;
    }
  };

  return {
    conversationId,
    messages,
    isLoading,
    extractedData,
    isReady,
    fieldsSchema,
    checkForDraft,
    startConversation,
    loadConversation,
    sendMessage,
    completeConversation,
    abandonConversation,
    deleteConversation,
    resetConversation,
    cancelLoading,
  };
}
