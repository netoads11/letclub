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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          icone: string
          id: string
          nome: string
          slug: string
          xp_reward: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome: string
          slug: string
          xp_reward?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          slug?: string
          xp_reward?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          feedback: Database["public"]["Enums"]["chat_feedback"] | null
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          session_active: boolean
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feedback?: Database["public"]["Enums"]["chat_feedback"] | null
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          session_active?: boolean
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feedback?: Database["public"]["Enums"]["chat_feedback"] | null
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          session_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          anotacao: string | null
          completed_at: string
          dia_numero: number
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          anotacao?: string | null
          completed_at?: string
          dia_numero: number
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          anotacao?: string | null
          completed_at?: string
          dia_numero?: number
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_app: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          ativo: boolean
          created_at: string
          descricao_completa: string
          descricao_curta: string
          dia_numero: number
          icone: string
          id: string
          ordem: number
          titulo: string
          video_url: string | null
          xp_reward: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao_completa?: string
          descricao_curta?: string
          dia_numero: number
          icone?: string
          id?: string
          ordem?: number
          titulo: string
          video_url?: string | null
          xp_reward?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao_completa?: string
          descricao_curta?: string
          dia_numero?: number
          icone?: string
          id?: string
          ordem?: number
          titulo?: string
          video_url?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pesos_historico: {
        Row: {
          created_at: string
          id: string
          peso: number
          registrado_em: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          peso: number
          registrado_em?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          peso?: number
          registrado_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesos_historico_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_comunidade: {
        Row: {
          created_at: string
          fixado: boolean
          id: string
          imagem_url: string | null
          removido: boolean
          reportado: boolean
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fixado?: boolean
          id?: string
          imagem_url?: string | null
          removido?: boolean
          reportado?: boolean
          texto: string
          user_id: string
        }
        Update: {
          created_at?: string
          fixado?: boolean
          id?: string
          imagem_url?: string | null
          removido?: boolean
          reportado?: boolean
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_comunidade_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          altura: number | null
          avatar_url: string | null
          bloqueado: boolean
          challenge_start_date: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          meta_peso: number | null
          notificacoes_ativas: boolean
          onboarding_completed: boolean
          peso_atual: number | null
          peso_inicial: number | null
          principal_dificuldade:
            | Database["public"]["Enums"]["dificuldade_principal"]
            | null
          restricoes_alimentares: string[]
          streak_atual: number
          streak_recorde: number
          ultimo_checkin: string | null
          xp_total: number
        }
        Insert: {
          altura?: number | null
          avatar_url?: string | null
          bloqueado?: boolean
          challenge_start_date?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          meta_peso?: number | null
          notificacoes_ativas?: boolean
          onboarding_completed?: boolean
          peso_atual?: number | null
          peso_inicial?: number | null
          principal_dificuldade?:
            | Database["public"]["Enums"]["dificuldade_principal"]
            | null
          restricoes_alimentares?: string[]
          streak_atual?: number
          streak_recorde?: number
          ultimo_checkin?: string | null
          xp_total?: number
        }
        Update: {
          altura?: number | null
          avatar_url?: string | null
          bloqueado?: boolean
          challenge_start_date?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          meta_peso?: number | null
          notificacoes_ativas?: boolean
          onboarding_completed?: boolean
          peso_atual?: number | null
          peso_inicial?: number | null
          principal_dificuldade?:
            | Database["public"]["Enums"]["dificuldade_principal"]
            | null
          restricoes_alimentares?: string[]
          streak_atual?: number
          streak_recorde?: number
          ultimo_checkin?: string | null
          xp_total?: number
        }
        Relationships: []
      }
      reacoes_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tipo: Database["public"]["Enums"]["tipo_reacao"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tipo: Database["public"]["Enums"]["tipo_reacao"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tipo?: Database["public"]["Enums"]["tipo_reacao"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reacoes_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts_comunidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reacoes_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          ativo: boolean
          created_at: string
          dia_numero: number | null
          id: string
          imagem_url: string | null
          ingredientes: Json
          modo_preparo: string[]
          nome: string
          restricoes_compativeis: string[]
          tempo_preparo: number
          tipo_refeicao: Database["public"]["Enums"]["tipo_refeicao"]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_numero?: number | null
          id?: string
          imagem_url?: string | null
          ingredientes?: Json
          modo_preparo?: string[]
          nome: string
          restricoes_compativeis?: string[]
          tempo_preparo?: number
          tipo_refeicao: Database["public"]["Enums"]["tipo_refeicao"]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_numero?: number | null
          id?: string
          imagem_url?: string | null
          ingredientes?: Json
          modo_preparo?: string[]
          nome?: string
          restricoes_compativeis?: string[]
          tempo_preparo?: number
          tipo_refeicao?: Database["public"]["Enums"]["tipo_refeicao"]
        }
        Relationships: []
      }
      receitas_favoritas: {
        Row: {
          id: string
          receita_id: string
          salvo_em: string
          user_id: string
        }
        Insert: {
          id?: string
          receita_id: string
          salvo_em?: string
          user_id: string
        }
        Update: {
          id?: string
          receita_id?: string
          salvo_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receitas_favoritas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_favoritas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          desbloqueado_em: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          desbloqueado_em?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          desbloqueado_em?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      unlock_badge: {
        Args: { _slug: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "aluna"
      chat_feedback: "positivo" | "negativo"
      chat_role: "user" | "assistant"
      dificuldade_principal:
        | "inchaco"
        | "intestino"
        | "energia"
        | "emagrecimento"
        | "outro"
      tipo_notificacao:
        | "missao"
        | "conquista"
        | "let"
        | "comunidade"
        | "sistema"
      tipo_reacao: "coracao" | "forca" | "fogo"
      tipo_refeicao: "cafe" | "almoco" | "lanche" | "jantar" | "cha"
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
      app_role: ["admin", "aluna"],
      chat_feedback: ["positivo", "negativo"],
      chat_role: ["user", "assistant"],
      dificuldade_principal: [
        "inchaco",
        "intestino",
        "energia",
        "emagrecimento",
        "outro",
      ],
      tipo_notificacao: ["missao", "conquista", "let", "comunidade", "sistema"],
      tipo_reacao: ["coracao", "forca", "fogo"],
      tipo_refeicao: ["cafe", "almoco", "lanche", "jantar", "cha"],
    },
  },
} as const
