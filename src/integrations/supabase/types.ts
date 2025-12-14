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
      admin_neighborhood_additions: {
        Row: {
          city_name: string
          created_at: string
          id: string
          neighborhood_name: string
        }
        Insert: {
          city_name: string
          created_at?: string
          id?: string
          neighborhood_name: string
        }
        Update: {
          city_name?: string
          created_at?: string
          id?: string
          neighborhood_name?: string
        }
        Relationships: []
      }
      buyer_agents: {
        Row: {
          agent_id: string
          buyer_id: string
          created_at: string | null
        }
        Insert: {
          agent_id: string
          buyer_id: string
          created_at?: string | null
        }
        Update: {
          agent_id?: string
          buyer_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_agents_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_messages: {
        Row: {
          agent_id: string
          buyer_id: string
          created_at: string | null
          id: string
          message: string
          property_id: string | null
        }
        Insert: {
          agent_id: string
          buyer_id: string
          created_at?: string | null
          id?: string
          message: string
          property_id?: string | null
        }
        Update: {
          agent_id?: string
          buyer_id?: string
          created_at?: string | null
          id?: string
          message?: string
          property_id?: string | null
        }
        Relationships: []
      }
      buyer_properties: {
        Row: {
          agent_id: string | null
          buyer_id: string | null
          disliked_text: string | null
          id: string
          liked_text: string | null
          not_interested_reason: string | null
          note: string | null
          price_offered: number | null
          property_id: string | null
          status: string | null
          updated_at: string | null
          visited_at: string | null
        }
        Insert: {
          agent_id?: string | null
          buyer_id?: string | null
          disliked_text?: string | null
          id?: string
          liked_text?: string | null
          not_interested_reason?: string | null
          note?: string | null
          price_offered?: number | null
          property_id?: string | null
          status?: string | null
          updated_at?: string | null
          visited_at?: string | null
        }
        Update: {
          agent_id?: string | null
          buyer_id?: string | null
          disliked_text?: string | null
          id?: string
          liked_text?: string | null
          not_interested_reason?: string | null
          note?: string | null
          price_offered?: number | null
          property_id?: string | null
          status?: string | null
          updated_at?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_properties_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          client_match_summary: string | null
          created_at: string | null
          created_by_agent_id: string | null
          floor_max: number | null
          floor_min: number | null
          full_name: string
          global_disliked_profile: string | null
          global_liked_profile: string | null
          id: string
          min_rooms: number | null
          notes: string | null
          phone: string | null
          required_features: string[] | null
          target_cities: string[] | null
          target_neighborhoods: string[] | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          client_match_summary?: string | null
          created_at?: string | null
          created_by_agent_id?: string | null
          floor_max?: number | null
          floor_min?: number | null
          full_name: string
          global_disliked_profile?: string | null
          global_liked_profile?: string | null
          id?: string
          min_rooms?: number | null
          notes?: string | null
          phone?: string | null
          required_features?: string[] | null
          target_cities?: string[] | null
          target_neighborhoods?: string[] | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          client_match_summary?: string | null
          created_at?: string | null
          created_by_agent_id?: string | null
          floor_max?: number | null
          floor_min?: number | null
          full_name?: string
          global_disliked_profile?: string | null
          global_liked_profile?: string | null
          id?: string
          min_rooms?: number | null
          notes?: string | null
          phone?: string | null
          required_features?: string[] | null
          target_cities?: string[] | null
          target_neighborhoods?: string[] | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
        }
        Relationships: []
      }
      invite_properties: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_properties_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          agent_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          message: string | null
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          agent_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          message?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          agent_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          message?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          buyer_id: string
          created_at: string
          hard_filter_passed: boolean
          id: string
          match_reason: string | null
          match_score: number
          property_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          hard_filter_passed?: boolean
          id?: string
          match_reason?: string | null
          match_score: number
          property_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          hard_filter_passed?: boolean
          id?: string
          match_reason?: string | null
          match_score?: number
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          property_id: string | null
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          property_id?: string | null
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          property_id?: string | null
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods_lookup: {
        Row: {
          city_name: string
          created_at: string | null
          id: string
          neighborhood_name: string
        }
        Insert: {
          city_name: string
          created_at?: string | null
          id?: string
          neighborhood_name: string
        }
        Update: {
          city_name?: string
          created_at?: string | null
          id?: string
          neighborhood_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_id: string | null
          air_directions: string | null
          build_year: number | null
          city: string
          created_at: string | null
          created_by: string | null
          description: string | null
          drive_folder_id: string | null
          floor: number | null
          has_balcony: boolean | null
          has_elevator: boolean | null
          has_safe_room: boolean | null
          has_sun_balcony: boolean | null
          id: string
          neighborhood: string | null
          parking_spots: number | null
          price: number | null
          renovation_status: string | null
          rooms: number | null
          size_sqm: number | null
          status: string | null
          total_floors: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          air_directions?: string | null
          build_year?: number | null
          city: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          drive_folder_id?: string | null
          floor?: number | null
          has_balcony?: boolean | null
          has_elevator?: boolean | null
          has_safe_room?: boolean | null
          has_sun_balcony?: boolean | null
          id?: string
          neighborhood?: string | null
          parking_spots?: number | null
          price?: number | null
          renovation_status?: string | null
          rooms?: number | null
          size_sqm?: number | null
          status?: string | null
          total_floors?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          air_directions?: string | null
          build_year?: number | null
          city?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          drive_folder_id?: string | null
          floor?: number | null
          has_balcony?: boolean | null
          has_elevator?: boolean | null
          has_safe_room?: boolean | null
          has_sun_balcony?: boolean | null
          id?: string
          neighborhood?: string | null
          parking_spots?: number | null
          price?: number | null
          renovation_status?: string | null
          rooms?: number | null
          size_sqm?: number | null
          status?: string | null
          total_floors?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          created_at: string
          file_type: string | null
          id: string
          property_id: string
          source: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          id?: string
          property_id: string
          source?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          id?: string
          property_id?: string
          source?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      property_extended_details: {
        Row: {
          air_directions: string | null
          balcony_size_sqm: number | null
          bathrooms: number | null
          building_year: number | null
          created_at: string | null
          elevators_count: number | null
          floor: number | null
          has_elevator: boolean | null
          has_storage: boolean | null
          id: string
          parking_count: number | null
          parking_covered: boolean | null
          parking_type: string | null
          property_id: string | null
          renovation_level: string | null
          storage_size_sqm: number | null
          toilets: number | null
          total_floors: number | null
          updated_at: string | null
        }
        Insert: {
          air_directions?: string | null
          balcony_size_sqm?: number | null
          bathrooms?: number | null
          building_year?: number | null
          created_at?: string | null
          elevators_count?: number | null
          floor?: number | null
          has_elevator?: boolean | null
          has_storage?: boolean | null
          id?: string
          parking_count?: number | null
          parking_covered?: boolean | null
          parking_type?: string | null
          property_id?: string | null
          renovation_level?: string | null
          storage_size_sqm?: number | null
          toilets?: number | null
          total_floors?: number | null
          updated_at?: string | null
        }
        Update: {
          air_directions?: string | null
          balcony_size_sqm?: number | null
          bathrooms?: number | null
          building_year?: number | null
          created_at?: string | null
          elevators_count?: number | null
          floor?: number | null
          has_elevator?: boolean | null
          has_storage?: boolean | null
          id?: string
          parking_count?: number | null
          parking_covered?: boolean | null
          parking_type?: string | null
          property_id?: string | null
          renovation_level?: string | null
          storage_size_sqm?: number | null
          toilets?: number | null
          total_floors?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_extended_details_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          property_id: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          property_id?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          property_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          note: string
          property_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note: string
          property_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_ratings: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_favorite: boolean | null
          is_not_relevant: boolean | null
          property_id: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          is_not_relevant?: boolean | null
          property_id: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          is_not_relevant?: boolean | null
          property_id?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      property_views: {
        Row: {
          client_id: string
          id: string
          property_id: string
          source: string | null
          viewed_at: string
        }
        Insert: {
          client_id: string
          id?: string
          property_id: string
          source?: string | null
          viewed_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          property_id?: string
          source?: string | null
          viewed_at?: string
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
      add_property_for_buyer: {
        Args: {
          p_address: string
          p_buyer_id: string
          p_city: string
          p_description: string
          p_price: number
        }
        Returns: string
      }
      get_top_exclusion_reasons: {
        Args: { agent_id?: string; end_date?: string; start_date?: string }
        Returns: {
          count: number
          reason: string
        }[]
      }
      update_buyer_property: {
        Args: {
          p_buyer_id: string
          p_disliked_text?: string
          p_id: string
          p_liked_text?: string
          p_not_interested_reason?: string
          p_note?: string
          p_status?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "client"
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
      app_role: ["admin", "agent", "client"],
    },
  },
} as const
