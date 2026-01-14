export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_assistants: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fields_schema: Json | null
          greeting_message: string | null
          id: string
          is_active: boolean
          model_config: Json
          name: string
          ready_message: string | null
          slug: string
          system_prompt: string
          updated_at: string
          updated_by: string | null
          validations: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_schema?: Json | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean
          model_config?: Json
          name: string
          ready_message?: string | null
          slug: string
          system_prompt: string
          updated_at?: string
          updated_by?: string | null
          validations?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_schema?: Json | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean
          model_config?: Json
          name?: string
          ready_message?: string | null
          slug?: string
          system_prompt?: string
          updated_at?: string
          updated_by?: string | null
          validations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          color: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_immediate: boolean | null
          message: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_immediate?: boolean | null
          message: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_immediate?: boolean | null
          message?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_guide_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["brand_guide_block_type"]
          category_id: string | null
          content: Json
          created_at: string
          id: string
          page_id: string | null
          position: number
          updated_at: string
        }
        Insert: {
          block_type: Database["public"]["Enums"]["brand_guide_block_type"]
          category_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          page_id?: string | null
          position?: number
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["brand_guide_block_type"]
          category_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          page_id?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_guide_blocks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "brand_guide_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guide_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "brand_guide_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_guide_categories: {
        Row: {
          content: Json | null
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_guide_pages: {
        Row: {
          category_id: string
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_guide_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "brand_guide_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guide_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_guide_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit: {
        Row: {
          color_palette: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          typography: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          color_palette?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          typography?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          color_palette?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          typography?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      brand_kit_assets: {
        Row: {
          brand_kit_id: string | null
          created_at: string | null
          created_by: string | null
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          name: string
          thumbnail_url: string | null
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_type: string
          file_url: string
          folder_id?: string | null
          id?: string
          name: string
          thumbnail_url?: string | null
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          name?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_assets_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "brand_kit_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_folders: {
        Row: {
          brand_kit_id: string | null
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          position: number | null
        }
        Insert: {
          brand_kit_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number | null
        }
        Update: {
          brand_kit_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_folders_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_kit_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "brand_kit_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          acao_desejada: string
          attachments: Json | null
          base_manual_ou_automatica: string
          comportamento: string | null
          condicoes_especiais: string | null
          conexao_com_estrategia: string
          conexao_com_outras_acoes: string | null
          contexto_produto: string | null
          created_at: string
          created_by: string
          dados_relevantes: string | null
          desafios: string | null
          desafios_comerciais: string
          dores: string | null
          etapa_jornada: string | null
          id: string
          is_active: boolean
          links: Json | null
          links_figma: string | null
          metrica_de_negocio: string
          modalidade_conta: string
          motivo_demanda: string
          objetivo_final: string
          oferta_incentivo: string | null
          perfil: string | null
          prioridade_urgencia: string
          publico: string
          status: Database["public"]["Enums"]["briefing_status"]
          tela_destino: string
          tipo_usuario: string
          updated_at: string
          updated_by: string | null
          validade_datas: string | null
          volume_estimado: string | null
        }
        Insert: {
          acao_desejada: string
          attachments?: Json | null
          base_manual_ou_automatica: string
          comportamento?: string | null
          condicoes_especiais?: string | null
          conexao_com_estrategia: string
          conexao_com_outras_acoes?: string | null
          contexto_produto?: string | null
          created_at?: string
          created_by: string
          dados_relevantes?: string | null
          desafios?: string | null
          desafios_comerciais: string
          dores?: string | null
          etapa_jornada?: string | null
          id?: string
          is_active?: boolean
          links?: Json | null
          links_figma?: string | null
          metrica_de_negocio: string
          modalidade_conta: string
          motivo_demanda: string
          objetivo_final: string
          oferta_incentivo?: string | null
          perfil?: string | null
          prioridade_urgencia: string
          publico: string
          status?: Database["public"]["Enums"]["briefing_status"]
          tela_destino: string
          tipo_usuario: string
          updated_at?: string
          updated_by?: string | null
          validade_datas?: string | null
          volume_estimado?: string | null
        }
        Update: {
          acao_desejada?: string
          attachments?: Json | null
          base_manual_ou_automatica?: string
          comportamento?: string | null
          condicoes_especiais?: string | null
          conexao_com_estrategia?: string
          conexao_com_outras_acoes?: string | null
          contexto_produto?: string | null
          created_at?: string
          created_by?: string
          dados_relevantes?: string | null
          desafios?: string | null
          desafios_comerciais?: string
          dores?: string | null
          etapa_jornada?: string | null
          id?: string
          is_active?: boolean
          links?: Json | null
          links_figma?: string | null
          metrica_de_negocio?: string
          modalidade_conta?: string
          motivo_demanda?: string
          objetivo_final?: string
          oferta_incentivo?: string | null
          perfil?: string | null
          prioridade_urgencia?: string
          publico?: string
          status?: Database["public"]["Enums"]["briefing_status"]
          tela_destino?: string
          tipo_usuario?: string
          updated_at?: string
          updated_by?: string | null
          validade_datas?: string | null
          volume_estimado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canva_blocks: {
        Row: {
          block_type: string
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          thumbnail_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_type: string
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      character_images: {
        Row: {
          character_id: string
          created_at: string
          id: string
          image_url: string
          is_cover: boolean
          position: number
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          image_url: string
          is_cover?: boolean
          position?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_cover?: boolean
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "plugin_characters"
            referencedColumns: ["id"]
          },
        ]
      }
      efi_code_blocks: {
        Row: {
          category: string
          component_type: string
          created_at: string
          created_by: string | null
          default_props: Json | null
          description: string | null
          icon_name: string
          id: string
          is_active: boolean
          name: string
          position: number
          thumbnail_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          component_type: string
          created_at?: string
          created_by?: string | null
          default_props?: Json | null
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          component_type?: string
          created_at?: string
          created_by?: string | null
          default_props?: Json | null
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          thumbnail_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      efi_code_sites: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          css_content: string | null
          description: string | null
          html_content: string | null
          id: string
          is_published: boolean | null
          name: string
          page_settings: Json | null
          slug: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          css_content?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          page_settings?: Json | null
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          css_content?: string | null
          description?: string | null
          html_content?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          page_settings?: Json | null
          slug?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      efi_links: {
        Row: {
          af_ad: string | null
          af_adset: string | null
          af_channel: string | null
          c: string | null
          created_at: string
          deeplink: string | null
          deeplink_param: string | null
          id: string
          link_pattern: string
          name: string | null
          original_url: string | null
          pid: string | null
          shortened_code: string | null
          shortened_url: string | null
          updated_at: string
          url_destino: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          af_ad?: string | null
          af_adset?: string | null
          af_channel?: string | null
          c?: string | null
          created_at?: string
          deeplink?: string | null
          deeplink_param?: string | null
          id?: string
          link_pattern?: string
          name?: string | null
          original_url?: string | null
          pid?: string | null
          shortened_code?: string | null
          shortened_url?: string | null
          updated_at?: string
          url_destino: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          af_ad?: string | null
          af_adset?: string | null
          af_channel?: string | null
          c?: string | null
          created_at?: string
          deeplink?: string | null
          deeplink_param?: string | null
          id?: string
          link_pattern?: string
          name?: string | null
          original_url?: string | null
          pid?: string | null
          shortened_code?: string | null
          shortened_url?: string | null
          updated_at?: string
          url_destino?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      efi_report_config: {
        Row: {
          analysis_prompt: string
          aspect_ratio: string | null
          colors: Json | null
          created_at: string | null
          data_formatting_prompt: string
          design_prompt: string
          id: string
          logo_url: string | null
          recommendations_prompt: string
          resolution: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_prompt?: string
          aspect_ratio?: string | null
          colors?: Json | null
          created_at?: string | null
          data_formatting_prompt?: string
          design_prompt?: string
          id?: string
          logo_url?: string | null
          recommendations_prompt?: string
          resolution?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_prompt?: string
          aspect_ratio?: string | null
          colors?: Json | null
          created_at?: string | null
          data_formatting_prompt?: string
          design_prompt?: string
          id?: string
          logo_url?: string | null
          recommendations_prompt?: string
          resolution?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_blocks: {
        Row: {
          ai_instructions: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          html_template: string
          id: string
          is_active: boolean
          name: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          ai_instructions?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_template: string
          id?: string
          is_active?: boolean
          name: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          ai_instructions?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_active?: boolean
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_datasets: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_magic_config: {
        Row: {
          created_at: string | null
          id: string
          max_output_tokens: number | null
          reference_images: string[] | null
          system_instruction: string
          temperature: number | null
          thinking_level: string | null
          top_p: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_output_tokens?: number | null
          reference_images?: string[] | null
          system_instruction?: string
          temperature?: number | null
          thinking_level?: string | null
          top_p?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_output_tokens?: number | null
          reference_images?: string[] | null
          system_instruction?: string
          temperature?: number | null
          thinking_level?: string | null
          top_p?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_template_blocks: {
        Row: {
          block_id: string
          created_at: string
          custom_data: Json | null
          id: string
          position: number
          template_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          custom_data?: Json | null
          id?: string
          position: number
          template_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          custom_data?: Json | null
          id?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_template_blocks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "email_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks_data: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_model: boolean | null
          is_published: boolean
          name: string
          preview_text: string | null
          subject: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blocks_data?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_model?: boolean | null
          is_published?: boolean
          name: string
          preview_text?: string | null
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blocks_data?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_model?: boolean | null
          is_published?: boolean
          name?: string
          preview_text?: string | null
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          character_id: string | null
          character_name: string
          created_at: string
          error_message: string | null
          id: string
          image_url: string
          prediction_id: string | null
          prompt: string
          request_params: Json | null
          retry_count: number | null
          seal_type: string | null
          source: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          character_id?: string | null
          character_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url: string
          prediction_id?: string | null
          prompt: string
          request_params?: Json | null
          retry_count?: number | null
          seal_type?: string | null
          source?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          character_id?: string | null
          character_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string
          prediction_id?: string | null
          prompt?: string
          request_params?: Json | null
          retry_count?: number | null
          seal_type?: string | null
          source?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "plugin_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_campaign_assets: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          image_url: string
          is_visible: boolean
          name: string
          position: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          image_url: string
          is_visible?: boolean
          name: string
          position?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "image_campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "image_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      image_campaigns: {
        Row: {
          access_code: string | null
          background_image_url: string | null
          created_at: string
          created_by: string | null
          customization_mode: string
          footer_text: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          prompt: string | null
          seal_opacity: number | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          background_image_url?: string | null
          created_at?: string
          created_by?: string | null
          customization_mode?: string
          footer_text?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          prompt?: string | null
          seal_opacity?: number | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          background_image_url?: string | null
          created_at?: string
          created_by?: string | null
          customization_mode?: string
          footer_text?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          prompt?: string | null
          seal_opacity?: number | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_areas: {
        Row: {
          created_at: string
          default_subtasks: Json
          display_order: number
          id: string
          is_active: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_subtasks?: Json
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_subtasks?: Json
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      jira_okrs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          jira_epic_key: string | null
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          jira_epic_key?: string | null
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          jira_epic_key?: string | null
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_okrs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_task_subtasks: {
        Row: {
          area_id: string | null
          created_at: string
          id: string
          jira_subtask_key: string | null
          jira_task_id: string
          status: string
          subtask_name: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          jira_subtask_key?: string | null
          jira_task_id: string
          status?: string
          subtask_name: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          jira_subtask_key?: string | null
          jira_task_id?: string
          status?: string
          subtask_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_task_subtasks_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "jira_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_task_subtasks_jira_task_id_fkey"
            columns: ["jira_task_id"]
            isOneToOne: false
            referencedRelation: "jira_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_tasks: {
        Row: {
          areas: string[]
          created_at: string
          created_by: string
          description: string | null
          id: string
          jira_okr_id: string | null
          jira_response: Json | null
          jira_task_key: string | null
          sprint_label: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          areas?: string[]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          jira_okr_id?: string | null
          jira_response?: Json | null
          jira_task_key?: string | null
          sprint_label?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          areas?: string[]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          jira_okr_id?: string | null
          jira_response?: Json | null
          jira_task_key?: string | null
          sprint_label?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_tasks_jira_okr_id_fkey"
            columns: ["jira_okr_id"]
            isOneToOne: false
            referencedRelation: "jira_okrs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_extractions: {
        Row: {
          cleaned_markdown: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          file_name: string
          gemini_prediction_id: string | null
          id: string
          marker_prediction_id: string | null
          pdf_url: string
          raw_markdown: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cleaned_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_name: string
          gemini_prediction_id?: string | null
          id?: string
          marker_prediction_id?: string | null
          pdf_url: string
          raw_markdown?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cleaned_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_name?: string
          gemini_prediction_id?: string | null
          id?: string
          marker_prediction_id?: string | null
          pdf_url?: string
          raw_markdown?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plugin_characters: {
        Row: {
          created_at: string
          general_prompt: string | null
          id: string
          is_active: boolean
          name: string
          plugin_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          general_prompt?: string | null
          id?: string
          is_active?: boolean
          name: string
          plugin_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          general_prompt?: string | null
          id?: string
          is_active?: boolean
          name?: string
          plugin_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_characters_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          created_at: string | null
          description: string | null
          general_prompt: string | null
          id: string
          image_url: string | null
          in_development: boolean
          is_active: boolean | null
          is_new: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          general_prompt?: string | null
          id?: string
          image_url?: string | null
          in_development?: boolean
          is_active?: boolean | null
          is_new?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          general_prompt?: string | null
          id?: string
          image_url?: string | null
          in_development?: boolean
          is_active?: boolean | null
          is_new?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          credits: number
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          job_title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          credits?: number
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_admin?: boolean | null
          job_title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          credits?: number
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          job_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_files: {
        Row: {
          created_at: string | null
          download_count: number | null
          expires_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_active: boolean | null
          password_hash: string | null
          share_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_active?: boolean | null
          password_hash?: string | null
          share_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_active?: boolean | null
          password_hash?: string | null
          share_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      slide_generations: {
        Row: {
          created_at: string
          dimensions: string | null
          error_message: string | null
          export_as: string | null
          export_url: string | null
          gamma_url: string | null
          generation_id: string | null
          header_footer: Json | null
          id: string
          images_data: Json | null
          input_text: string
          original_filename: string | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dimensions?: string | null
          error_message?: string | null
          export_as?: string | null
          export_url?: string | null
          gamma_url?: string | null
          generation_id?: string | null
          header_footer?: Json | null
          id?: string
          images_data?: Json | null
          input_text: string
          original_filename?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dimensions?: string | null
          error_message?: string | null
          export_as?: string | null
          export_url?: string | null
          gamma_url?: string | null
          generation_id?: string | null
          header_footer?: Json | null
          id?: string
          images_data?: Json | null
          input_text?: string
          original_filename?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_ai_conversations: {
        Row: {
          assistant_id: string | null
          completed_at: string | null
          created_at: string
          extracted_data: Json | null
          id: string
          messages: Json
          prediction_id: string | null
          status: string
          test_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_id?: string | null
          completed_at?: string | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          messages?: Json
          prediction_id?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_id?: string | null
          completed_at?: string | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          messages?: Json
          prediction_id?: string | null
          status?: string
          test_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_ai_conversations_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "ai_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_ai_conversations_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          attachments: Json | null
          created_at: string
          created_by: string
          end_date: string | null
          hypothesis: string
          id: string
          insights: string | null
          is_active: boolean
          links: Json | null
          nome_teste: string
          share_code: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["test_status"]
          success_metric: string[] | null
          target_audience: string | null
          test_images: Json | null
          test_types: string[]
          tested_elements: string | null
          tools: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          created_by: string
          end_date?: string | null
          hypothesis: string
          id?: string
          insights?: string | null
          is_active?: boolean
          links?: Json | null
          nome_teste: string
          share_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["test_status"]
          success_metric?: string[] | null
          target_audience?: string | null
          test_images?: Json | null
          test_types?: string[]
          tested_elements?: string | null
          tools?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          hypothesis?: string
          id?: string
          insights?: string | null
          is_active?: boolean
          links?: Json | null
          nome_teste?: string
          share_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["test_status"]
          success_metric?: string[] | null
          target_audience?: string | null
          test_images?: Json | null
          test_types?: string[]
          tested_elements?: string | null
          tools?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      brand_guide_block_type:
        | "single_column"
        | "two_columns"
        | "three_columns"
        | "title_only"
        | "text_only"
        | "image"
        | "video"
        | "embed"
        | "separator"
      briefing_status: "rascunho" | "em_revisao" | "aprovado" | "concluido"
      test_status: "planejamento" | "execucao" | "analise" | "documentacao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      brand_guide_block_type: [
        "single_column",
        "two_columns",
        "three_columns",
        "title_only",
        "text_only",
        "image",
        "video",
        "embed",
        "separator",
      ],
      briefing_status: ["rascunho", "em_revisao", "aprovado", "concluido"],
      test_status: ["planejamento", "execucao", "analise", "documentacao"],
    },
  },
} as const
