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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      psych_events: {
        Row: {
          creado_en: string
          datos: Json
          emocion: string | null
          id: string
          intensidad: number | null
          sesion_id: string
          tipo: string
          trade_id: string | null
          user_id: string
        }
        Insert: {
          creado_en?: string
          datos?: Json
          emocion?: string | null
          id?: string
          intensidad?: number | null
          sesion_id: string
          tipo: string
          trade_id?: string | null
          user_id: string
        }
        Update: {
          creado_en?: string
          datos?: Json
          emocion?: string | null
          id?: string
          intensidad?: number | null
          sesion_id?: string
          tipo?: string
          trade_id?: string | null
          user_id?: string
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
          cerrada_en: string | null
          checklist: Json
          created_at: string
          emocion_final: string | null
          emocion_inicial: string | null
          id: string
          iniciada_en: string
          intensidad_inicial: number | null
          limite_ciclos_ganados: number
          limite_ciclos_perdidos: number
          modo: string
          motivo_cierre: string | null
          pausa_hasta: string | null
          pausa_minutos: number
          plataforma: string
          puntaje_preparacion: number | null
          reflexion: string | null
          user_id: string
        }
        Insert: {
          cerrada_en?: string | null
          checklist?: Json
          created_at?: string
          emocion_final?: string | null
          emocion_inicial?: string | null
          id?: string
          iniciada_en?: string
          intensidad_inicial?: number | null
          limite_ciclos_ganados?: number
          limite_ciclos_perdidos?: number
          modo?: string
          motivo_cierre?: string | null
          pausa_hasta?: string | null
          pausa_minutos?: number
          plataforma?: string
          puntaje_preparacion?: number | null
          reflexion?: string | null
          user_id: string
        }
        Update: {
          cerrada_en?: string | null
          checklist?: Json
          created_at?: string
          emocion_final?: string | null
          emocion_inicial?: string | null
          id?: string
          iniciada_en?: string
          intensidad_inicial?: number | null
          limite_ciclos_ganados?: number
          limite_ciclos_perdidos?: number
          modo?: string
          motivo_cierre?: string | null
          pausa_hasta?: string | null
          pausa_minutos?: number
          plataforma?: string
          puntaje_preparacion?: number | null
          reflexion?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          bot: string | null
          broker: string | null
          categoria_estrategia: string | null
          ciclo_id: string | null
          contexto_15m: string | null
          contexto_1h: string | null
          created_at: string
          cumplio_reglas: boolean | null
          direccion: string
          ema_senal: string | null
          entrada_por: string | null
          estado: string | null
          estado_emocional: string | null
          estrategia: string | null
          expiracion_seg: number | null
          fecha_entrada: string
          fecha_salida: string
          id: string
          id_externo: string | null
          instrumento: string
          intensidad_emocional: number | null
          modo: string | null
          moneda: string
          motivo_salida: string | null
          notas: string | null
          origen: string | null
          paso: number | null
          payout_pct: number | null
          plataforma: string
          posicion_en_canal: string | null
          precio_cierre: number | null
          precio_entrada: number | null
          resultado_pct_cuenta: number | null
          resultado_usd: number
          riesgo_pct_cuenta: number | null
          saldo_antes: number
          saldo_despues: number
          senal: string | null
          sesion_id: string | null
          stake_usd: number
          stop_plan_usd: number | null
          tf_principal: string | null
          tipo_paso: string | null
          tipo_sesion: string
          tipo_setup: string | null
          tp_plan_usd: number | null
          user_id: string
        }
        Insert: {
          bot?: string | null
          broker?: string | null
          categoria_estrategia?: string | null
          ciclo_id?: string | null
          contexto_15m?: string | null
          contexto_1h?: string | null
          created_at?: string
          cumplio_reglas?: boolean | null
          direccion: string
          ema_senal?: string | null
          entrada_por?: string | null
          estado?: string | null
          estado_emocional?: string | null
          estrategia?: string | null
          expiracion_seg?: number | null
          fecha_entrada: string
          fecha_salida: string
          id: string
          id_externo?: string | null
          instrumento: string
          intensidad_emocional?: number | null
          modo?: string | null
          moneda?: string
          motivo_salida?: string | null
          notas?: string | null
          origen?: string | null
          paso?: number | null
          payout_pct?: number | null
          plataforma?: string
          posicion_en_canal?: string | null
          precio_cierre?: number | null
          precio_entrada?: number | null
          resultado_pct_cuenta?: number | null
          resultado_usd: number
          riesgo_pct_cuenta?: number | null
          saldo_antes: number
          saldo_despues: number
          senal?: string | null
          sesion_id?: string | null
          stake_usd: number
          stop_plan_usd?: number | null
          tf_principal?: string | null
          tipo_paso?: string | null
          tipo_sesion?: string
          tipo_setup?: string | null
          tp_plan_usd?: number | null
          user_id: string
        }
        Update: {
          bot?: string | null
          broker?: string | null
          categoria_estrategia?: string | null
          ciclo_id?: string | null
          contexto_15m?: string | null
          contexto_1h?: string | null
          created_at?: string
          cumplio_reglas?: boolean | null
          direccion?: string
          ema_senal?: string | null
          entrada_por?: string | null
          estado?: string | null
          estado_emocional?: string | null
          estrategia?: string | null
          expiracion_seg?: number | null
          fecha_entrada?: string
          fecha_salida?: string
          id?: string
          id_externo?: string | null
          instrumento?: string
          intensidad_emocional?: number | null
          modo?: string | null
          moneda?: string
          motivo_salida?: string | null
          notas?: string | null
          origen?: string | null
          paso?: number | null
          payout_pct?: number | null
          plataforma?: string
          posicion_en_canal?: string | null
          precio_cierre?: number | null
          precio_entrada?: number | null
          resultado_pct_cuenta?: number | null
          resultado_usd?: number
          riesgo_pct_cuenta?: number | null
          saldo_antes?: number
          saldo_despues?: number
          senal?: string | null
          sesion_id?: string | null
          stake_usd?: number
          stop_plan_usd?: number | null
          tf_principal?: string | null
          tipo_paso?: string | null
          tipo_sesion?: string
          tipo_setup?: string | null
          tp_plan_usd?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "psych_sessions"
            referencedColumns: ["id"]
          },
        ]
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
