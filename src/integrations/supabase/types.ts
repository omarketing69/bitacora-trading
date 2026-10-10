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
      psych_events: {
        Row: {
          id: string
          user_id: string
          sesion_id: string
          creado_en: string
          tipo: string
          emocion: string | null
          intensidad: number | null
          trade_id: string | null
          datos: Json
        }
        Insert: {
          id?: string
          user_id: string
          sesion_id: string
          creado_en?: string
          tipo: string
          emocion?: string | null
          intensidad?: number | null
          trade_id?: string | null
          datos?: Json
        }
        Update: {
          id?: string
          user_id?: string
          sesion_id?: string
          creado_en?: string
          tipo?: string
          emocion?: string | null
          intensidad?: number | null
          trade_id?: string | null
          datos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "psych_events_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "psych_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psych_events_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      psych_sessions: {
        Row: {
          id: string
          user_id: string
          plataforma: string
          modo: string
          iniciada_en: string
          cerrada_en: string | null
          checklist: Json
          puntaje_preparacion: number | null
          emocion_inicial: string | null
          intensidad_inicial: number | null
          limite_ciclos_perdidos: number
          limite_ciclos_ganados: number
          pausa_minutos: number
          pausa_hasta: string | null
          motivo_cierre: string | null
          emocion_final: string | null
          reflexion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plataforma?: string
          modo?: string
          iniciada_en?: string
          cerrada_en?: string | null
          checklist?: Json
          puntaje_preparacion?: number | null
          emocion_inicial?: string | null
          intensidad_inicial?: number | null
          limite_ciclos_perdidos?: number
          limite_ciclos_ganados?: number
          pausa_minutos?: number
          pausa_hasta?: string | null
          motivo_cierre?: string | null
          emocion_final?: string | null
          reflexion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plataforma?: string
          modo?: string
          iniciada_en?: string
          cerrada_en?: string | null
          checklist?: Json
          puntaje_preparacion?: number | null
          emocion_inicial?: string | null
          intensidad_inicial?: number | null
          limite_ciclos_perdidos?: number
          limite_ciclos_ganados?: number
          pausa_minutos?: number
          pausa_hasta?: string | null
          motivo_cierre?: string | null
          emocion_final?: string | null
          reflexion?: string | null
          created_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          contexto_1h: string | null
          created_at: string
          direccion: string
          entrada_por: string | null
          fecha_entrada: string
          fecha_salida: string
          id: string
          instrumento: string
          moneda: string
          motivo_salida: string | null
          notas: string | null
          posicion_en_canal: string | null
          resultado_pct_cuenta: number | null
          resultado_usd: number
          riesgo_pct_cuenta: number | null
          saldo_antes: number
          saldo_despues: number
          stake_usd: number
          stop_plan_usd: number | null
          tf_principal: string | null
          tipo_setup: string | null
          tp_plan_usd: number | null
          plataforma: string
          broker: string | null
          modo: string | null
          origen: string | null
          bot: string | null
          estrategia: string | null
          categoria_estrategia: string | null
          senal: string | null
          payout_pct: number | null
          expiracion_seg: number | null
          precio_entrada: number | null
          precio_cierre: number | null
          estado: string | null
          ciclo_id: string | null
          paso: number | null
          tipo_paso: string | null
          id_externo: string | null
          ema_senal: string | null
          contexto_15m: string | null
          estado_emocional: string | null
          intensidad_emocional: number | null
          cumplio_reglas: boolean | null
          sesion_id: string | null
          user_id: string
        }
        Insert: {
          contexto_1h?: string | null
          created_at?: string
          direccion: string
          entrada_por?: string | null
          fecha_entrada: string
          fecha_salida: string
          id: string
          instrumento: string
          moneda?: string
          motivo_salida?: string | null
          notas?: string | null
          posicion_en_canal?: string | null
          resultado_pct_cuenta?: number | null
          resultado_usd: number
          riesgo_pct_cuenta?: number | null
          saldo_antes: number
          saldo_despues: number
          stake_usd: number
          stop_plan_usd?: number | null
          tf_principal?: string | null
          tipo_setup?: string | null
          tp_plan_usd?: number | null
          plataforma?: string
          broker?: string | null
          modo?: string | null
          origen?: string | null
          bot?: string | null
          estrategia?: string | null
          categoria_estrategia?: string | null
          senal?: string | null
          payout_pct?: number | null
          expiracion_seg?: number | null
          precio_entrada?: number | null
          precio_cierre?: number | null
          estado?: string | null
          ciclo_id?: string | null
          paso?: number | null
          tipo_paso?: string | null
          id_externo?: string | null
          ema_senal?: string | null
          contexto_15m?: string | null
          estado_emocional?: string | null
          intensidad_emocional?: number | null
          cumplio_reglas?: boolean | null
          sesion_id?: string | null
          user_id: string
        }
        Update: {
          contexto_1h?: string | null
          created_at?: string
          direccion?: string
          entrada_por?: string | null
          fecha_entrada?: string
          fecha_salida?: string
          id?: string
          instrumento?: string
          moneda?: string
          motivo_salida?: string | null
          notas?: string | null
          posicion_en_canal?: string | null
          resultado_pct_cuenta?: number | null
          resultado_usd?: number
          riesgo_pct_cuenta?: number | null
          saldo_antes?: number
          saldo_despues?: number
          stake_usd?: number
          stop_plan_usd?: number | null
          tf_principal?: string | null
          tipo_setup?: string | null
          tp_plan_usd?: number | null
          plataforma?: string
          broker?: string | null
          modo?: string | null
          origen?: string | null
          bot?: string | null
          estrategia?: string | null
          categoria_estrategia?: string | null
          senal?: string | null
          payout_pct?: number | null
          expiracion_seg?: number | null
          precio_entrada?: number | null
          precio_cierre?: number | null
          estado?: string | null
          ciclo_id?: string | null
          paso?: number | null
          tipo_paso?: string | null
          id_externo?: string | null
          ema_senal?: string | null
          contexto_15m?: string | null
          estado_emocional?: string | null
          intensidad_emocional?: number | null
          cumplio_reglas?: boolean | null
          sesion_id?: string | null
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
