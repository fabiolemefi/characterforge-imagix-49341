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
  test_types?: string[];
  tools?: string[];
  target_audience?: string | null;
  tested_elements?: string | null;
  success_metric?: string[];
  start_date?: string | null;
  end_date?: string | null;
}

interface AIResponse {
  message: string;
  status: "collecting" | "ready";
  extracted_data: ExtractedTestData;
  next_question?: string;
}

export function useTestAIConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTestData>({});
  const [isReady, setIsReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

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
          console.log("Realtime update received:", payload);
          const newData = payload.new as any;
          
          // Update local state with new data from database
          if (newData.messages) {
            setMessages(newData.messages as Message[]);
          }
          if (newData.extracted_data) {
            setExtractedData(newData.extracted_data as ExtractedTestData);
          }
          if (newData.status === "ready") {
            setIsReady(true);
          }
          
          // Clear loading state when prediction_id is cleared (response received)
          if (newData.prediction_id === null) {
            setIsLoading(false);
            // Clear timeout and polling if they exist
            if ((window as any).__aiTimeoutId) {
              clearTimeout((window as any).__aiTimeoutId);
              (window as any).__aiTimeoutId = null;
            }
            if ((window as any).__aiPollingId) {
              clearInterval((window as any).__aiPollingId);
              (window as any).__aiPollingId = null;
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Setup polling to check for updates every second (fallback if realtime fails)
    const pollingInterval = setInterval(async () => {
      if (!conversationId) return;
      
      try {
        const { data, error } = await supabase
          .from("test_ai_conversations")
          .select("*")
          .eq("id", conversationId)
          .single();

        if (error) throw error;
        if (!data) return;

        // Only update if prediction_id is null (response received)
        if (data.prediction_id === null) {
          console.log("Polling detected update");
          
          if (data.messages) {
            setMessages(data.messages as unknown as Message[]);
          }
          if (data.extracted_data) {
            setExtractedData(data.extracted_data as unknown as ExtractedTestData);
          }
          if (data.status === "ready") {
            setIsReady(true);
          }
          
          // Clear loading state
          setIsLoading(false);
          
          // Clear timeout and polling
          if ((window as any).__aiTimeoutId) {
            clearTimeout((window as any).__aiTimeoutId);
            (window as any).__aiTimeoutId = null;
          }
          if ((window as any).__aiPollingId) {
            clearInterval((window as any).__aiPollingId);
            (window as any).__aiPollingId = null;
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

      // Call edge function (will return immediately with prediction_id)
      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-test-ai", {
        body: {
          messages: updatedMessages,
          conversationId: conversationId,
        },
      });

      if (aiError) throw aiError;
      if (!aiData) throw new Error("Nenhuma resposta da IA");

      console.log("AI prediction created:", aiData);
      
      // Set timeout to detect if response takes too long (60 seconds)
      const timeoutId = setTimeout(() => {
        console.error("AI response timeout - no realtime update received");
        setIsLoading(false);
        toast.error("A resposta da IA está demorando muito. Tente novamente.", {
          action: {
            label: "Tentar novamente",
            onClick: () => sendMessage(content, isGreeting),
          },
        });
      }, 60000);

      // Store timeout ID to clear it when response arrives
      (window as any).__aiTimeoutId = timeoutId;
      
      // The actual AI response will come through realtime
      // Loading state will be cleared when realtime update arrives
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem: " + error.message);
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

  return {
    conversationId,
    messages,
    isLoading,
    extractedData,
    isReady,
    checkForDraft,
    startConversation,
    loadConversation,
    sendMessage,
    completeConversation,
    abandonConversation,
    deleteConversation,
  };
}
