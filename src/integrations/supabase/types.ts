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
      agendamentos: {
        Row: {
          cliente: string
          cliente_id: string | null
          created_at: string | null
          data: string
          data_venda: string
          groomer: string
          horario: string
          horario_termino: string
          id: string
          numero_servico_pacote: string | null
          pet: string
          raca: string
          servico: string
          status: string
          taxi_dog: string
          tempo_servico: string
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          cliente: string
          cliente_id?: string | null
          created_at?: string | null
          data: string
          data_venda: string
          groomer: string
          horario: string
          horario_termino: string
          id?: string
          numero_servico_pacote?: string | null
          pet: string
          raca: string
          servico: string
          status: string
          taxi_dog: string
          tempo_servico: string
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          cliente?: string
          cliente_id?: string | null
          created_at?: string | null
          data?: string
          data_venda?: string
          groomer?: string
          horario?: string
          horario_termino?: string
          id?: string
          numero_servico_pacote?: string | null
          pet?: string
          raca?: string
          servico?: string
          status?: string
          taxi_dog?: string
          tempo_servico?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos_pacotes: {
        Row: {
          created_at: string | null
          data_venda: string
          id: string
          nome_cliente: string
          nome_pacote: string
          nome_pet: string
          raca: string
          servicos: Json
          taxi_dog: string
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          data_venda: string
          id?: string
          nome_cliente: string
          nome_pacote: string
          nome_pet: string
          raca: string
          servicos: Json
          taxi_dog: string
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          data_venda?: string
          id?: string
          nome_cliente?: string
          nome_pacote?: string
          nome_pet?: string
          raca?: string
          servicos?: Json
          taxi_dog?: string
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string | null
          endereco: string | null
          id: string
          nome_cliente: string
          observacao: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome_cliente: string
          observacao?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome_cliente?: string
          observacao?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          saldo: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          saldo?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          saldo?: number | null
          user_id?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string | null
          conta_id: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_config: {
        Row: {
          bordao: string | null
          created_at: string | null
          endereco: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          nome_empresa: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bordao?: string | null
          created_at?: string | null
          endereco?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome_empresa?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bordao?: string | null
          created_at?: string | null
          endereco?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome_empresa?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      groomers: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamentos_financeiros: {
        Row: {
          ano: string
          cliente_id: string | null
          conta_id: string | null
          created_at: string | null
          data_cadastro: string
          data_pagamento: string
          descricao1: string
          id: string
          mes_competencia: string
          observacao: string | null
          pago: boolean
          tipo: string
          updated_at: string | null
          user_id: string
          valor_total: number
        }
        Insert: {
          ano: string
          cliente_id?: string | null
          conta_id?: string | null
          created_at?: string | null
          data_cadastro?: string
          data_pagamento: string
          descricao1: string
          id?: string
          mes_competencia: string
          observacao?: string | null
          pago?: boolean
          tipo: string
          updated_at?: string | null
          user_id: string
          valor_total?: number
        }
        Update: {
          ano?: string
          cliente_id?: string | null
          conta_id?: string | null
          created_at?: string | null
          data_cadastro?: string
          data_pagamento?: string
          descricao1?: string
          id?: string
          mes_competencia?: string
          observacao?: string | null
          pago?: boolean
          tipo?: string
          updated_at?: string | null
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros_itens: {
        Row: {
          created_at: string | null
          descricao2: string
          id: string
          lancamento_id: string
          produto_servico: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao2: string
          id?: string
          lancamento_id: string
          produto_servico?: string | null
          valor?: number
        }
        Update: {
          created_at?: string | null
          descricao2?: string
          id?: string
          lancamento_id?: string
          produto_servico?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_itens_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      pacotes: {
        Row: {
          created_at: string | null
          desconto_percentual: number
          desconto_valor: number
          id: string
          nome: string
          servicos: Json
          user_id: string
          validade: string
          valor: number
          valor_final: number
        }
        Insert: {
          created_at?: string | null
          desconto_percentual?: number
          desconto_valor?: number
          id?: string
          nome: string
          servicos?: Json
          user_id: string
          validade?: string
          valor: number
          valor_final?: number
        }
        Update: {
          created_at?: string | null
          desconto_percentual?: number
          desconto_valor?: number
          id?: string
          nome?: string
          servicos?: Json
          user_id?: string
          validade?: string
          valor?: number
          valor_final?: number
        }
        Relationships: []
      }
      pets: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          nome_pet: string
          observacao: string | null
          porte: string
          raca: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          nome_pet: string
          observacao?: string | null
          porte: string
          raca: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          nome_pet?: string
          observacao?: string | null
          porte?: string
          raca?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          imposto: number
          lucro_unitario: number
          margem_lucro: number
          nome: string
          preco_custo: number
          taxa_cartao: number
          user_id: string
          valor: number
        }
        Insert: {
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          imposto?: number
          lucro_unitario?: number
          margem_lucro?: number
          nome: string
          preco_custo?: number
          taxa_cartao?: number
          user_id: string
          valor: number
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          imposto?: number
          lucro_unitario?: number
          margem_lucro?: number
          nome?: string
          preco_custo?: number
          taxa_cartao?: number
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email_hotmart: string
          id: string
          nome_completo: string
          updated_at: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          email_hotmart: string
          id: string
          nome_completo: string
          updated_at?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          email_hotmart?: string
          id?: string
          nome_completo?: string
          updated_at?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      racas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          porte: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          porte?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          porte?: string
          user_id?: string
        }
        Relationships: []
      }
      racas_padrao: {
        Row: {
          created_at: string
          id: string
          nome: string
          porte: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          porte: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          porte?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string | null
          conta_id: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          hotmart_transaction_id: string | null
          id: string
          plan_name: string
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          plan_name: string
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          plan_name?: string
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
