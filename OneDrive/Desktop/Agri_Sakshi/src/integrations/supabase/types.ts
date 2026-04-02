export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          district: string | null
          state: string | null
          farm_size_acres: number | null
          primary_crops: string[] | null
          language_pref: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          district?: string | null
          state?: string | null
          farm_size_acres?: number | null
          primary_crops?: string[] | null
          language_pref?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          district?: string | null
          state?: string | null
          farm_size_acres?: number | null
          primary_crops?: string[] | null
          language_pref?: string | null
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          language: string
          temperature_unit: string
          price_unit: string
          notifications_on: boolean
          dark_mode: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          language?: string
          temperature_unit?: string
          price_unit?: string
          notifications_on?: boolean
          dark_mode?: boolean
          updated_at?: string
        }
        Update: {
          language?: string
          temperature_unit?: string
          price_unit?: string
          notifications_on?: boolean
          dark_mode?: boolean
          updated_at?: string
        }
      }
      crop_history: {
        Row: {
          id: string
          user_id: string
          crop_name: string
          crop_id: string | null
          season: string | null
          year: number | null
          area_acres: number | null
          yield_quintals: number | null
          selling_price: number | null
          market: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          crop_name: string
          crop_id?: string | null
          season?: string | null
          year?: number | null
          area_acres?: number | null
          yield_quintals?: number | null
          selling_price?: number | null
          market?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          crop_name?: string
          crop_id?: string | null
          season?: string | null
          year?: number | null
          area_acres?: number | null
          yield_quintals?: number | null
          selling_price?: number | null
          market?: string | null
          notes?: string | null
        }
      }
      soil_readings: {
        Row: {
          id: string
          user_id: string
          test_date: string
          field_name: string | null
          ph: number | null
          nitrogen_ppm: number | null
          phosphorus_ppm: number | null
          potassium_ppm: number | null
          organic_matter: number | null
          ec_ds_m: number | null
          soil_type: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          test_date?: string
          field_name?: string | null
          ph?: number | null
          nitrogen_ppm?: number | null
          phosphorus_ppm?: number | null
          potassium_ppm?: number | null
          organic_matter?: number | null
          ec_ds_m?: number | null
          soil_type?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          test_date?: string
          field_name?: string | null
          ph?: number | null
          nitrogen_ppm?: number | null
          phosphorus_ppm?: number | null
          potassium_ppm?: number | null
          organic_matter?: number | null
          ec_ds_m?: number | null
          soil_type?: string | null
          notes?: string | null
        }
      }
      disease_detections: {
        Row: {
          id: string
          user_id: string
          detected_at: string
          crop_name: string | null
          disease_name: string | null
          scientific_name: string | null
          confidence: number | null
          severity: string | null
          pathogen_type: string | null
          is_healthy: boolean
          urgency: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          detected_at?: string
          crop_name?: string | null
          disease_name?: string | null
          scientific_name?: string | null
          confidence?: number | null
          severity?: string | null
          pathogen_type?: string | null
          is_healthy?: boolean
          urgency?: string | null
          notes?: string | null
        }
        Update: {
          crop_name?: string | null
          disease_name?: string | null
          scientific_name?: string | null
          confidence?: number | null
          severity?: string | null
          pathogen_type?: string | null
          is_healthy?: boolean
          urgency?: string | null
          notes?: string | null
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
