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
      email_blocks: {
        Row: {
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "plugin_characters"
            referencedColumns: ["id"]
          },
        ]
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
      ],
    },
  },
} as const
