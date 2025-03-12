export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clear_sky_production: {
        Row: {
          created_at: string
          id: string
          power: number
          shelly_config_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          power: number
          shelly_config_id: string
          timestamp: string
        }
        Update: {
          created_at?: string
          id?: string
          power?: number
          shelly_config_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "clear_sky_production_shelly_config_id_fkey"
            columns: ["shelly_config_id"]
            isOneToOne: false
            referencedRelation: "shelly_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_data: {
        Row: {
          consumption: number
          created_at: string | null
          frequency: number | null
          grid_pf: number | null
          grid_reactive: number | null
          grid_total: number
          grid_total_returned: number
          id: number
          production: number
          production_total: number
          pv_pf: number | null
          pv_reactive: number | null
          shelly_config_id: string | null
          timestamp: string
          voltage: number | null
        }
        Insert: {
          consumption: number
          created_at?: string | null
          frequency?: number | null
          grid_pf?: number | null
          grid_reactive?: number | null
          grid_total?: number
          grid_total_returned?: number
          id?: number
          production: number
          production_total?: number
          pv_pf?: number | null
          pv_reactive?: number | null
          shelly_config_id?: string | null
          timestamp: string
          voltage?: number | null
        }
        Update: {
          consumption?: number
          created_at?: string | null
          frequency?: number | null
          grid_pf?: number | null
          grid_reactive?: number | null
          grid_total?: number
          grid_total_returned?: number
          id?: number
          production?: number
          production_total?: number
          pv_pf?: number | null
          pv_reactive?: number | null
          shelly_config_id?: string | null
          timestamp?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_data_shelly_config_id_fkey"
            columns: ["shelly_config_id"]
            isOneToOne: false
            referencedRelation: "shelly_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      pv_panels: {
        Row: {
          azimuth: number
          created_at: string
          id: string
          inclination: number
          name: string | null
          power_wp: number
          shelly_config_id: string
          updated_at: string
        }
        Insert: {
          azimuth?: number
          created_at?: string
          id?: string
          inclination?: number
          name?: string | null
          power_wp?: number
          shelly_config_id: string
          updated_at?: string
        }
        Update: {
          azimuth?: number
          created_at?: string
          id?: string
          inclination?: number
          name?: string | null
          power_wp?: number
          shelly_config_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_panels_shelly_config_id_fkey"
            columns: ["shelly_config_id"]
            isOneToOne: false
            referencedRelation: "shelly_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      shelly_configs: {
        Row: {
          apikey: string
          created_at: string
          device_type: string | null
          deviceid: string
          grid_subscription_kva: number | null
          id: string
          inverter_power_kva: number | null
          latitude: number | null
          longitude: number | null
          name: string | null
          serverurl: string
          updated_at: string
        }
        Insert: {
          apikey: string
          created_at?: string
          device_type?: string | null
          deviceid: string
          grid_subscription_kva?: number | null
          id?: string
          inverter_power_kva?: number | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          serverurl?: string
          updated_at?: string
        }
        Update: {
          apikey?: string
          created_at?: string
          device_type?: string | null
          deviceid?: string
          grid_subscription_kva?: number | null
          id?: string
          inverter_power_kva?: number | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          serverurl?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_device_shares: {
        Row: {
          created_at: string | null
          id: string
          shelly_config_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shelly_config_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shelly_config_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_device_shares_shelly_config_id_fkey"
            columns: ["shelly_config_id"]
            isOneToOne: false
            referencedRelation: "shelly_configs"
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
