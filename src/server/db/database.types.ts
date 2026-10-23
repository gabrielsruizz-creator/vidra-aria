// Arquivo gerado por scripts/gen-db-types.mjs — não edite manualmente.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: number;
          table_name: string;
          record_id: string;
          action: string;
          changed_fields: string[] | null;
          old_data: Json | null;
          new_data: Json | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: never;
          table_name: string;
          record_id: string;
          action: string;
          changed_fields?: string[] | null;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: never;
          table_name?: string;
          record_id?: string;
          action?: string;
          changed_fields?: string[] | null;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [
        ];
      };
      company_settings: {
        Row: {
          id: boolean;
          company_name: string | null;
          default_target_margin_percent: number | null;
          price_stale_after_days: number;
          quote_validity_days: number;
          default_payment_terms: string | null;
          proposal_footer: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          company_name?: string | null;
          default_target_margin_percent?: number | string | null;
          price_stale_after_days?: number;
          quote_validity_days?: number;
          default_payment_terms?: string | null;
          proposal_footer?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          company_name?: string | null;
          default_target_margin_percent?: number | string | null;
          price_stale_after_days?: number;
          quote_validity_days?: number;
          default_payment_terms?: string | null;
          proposal_footer?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      customers: {
        Row: {
          id: string;
          person_type: Database["public"]["Enums"]["person_type"];
          name: string;
          trade_name: string | null;
          document: string | null;
          email: string | null;
          phone: string | null;
          address_street: string | null;
          address_number: string | null;
          address_complement: string | null;
          address_district: string | null;
          address_city: string | null;
          address_state: string | null;
          address_postal_code: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          person_type?: Database["public"]["Enums"]["person_type"];
          name: string;
          trade_name?: string | null;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_district?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_postal_code?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          person_type?: Database["public"]["Enums"]["person_type"];
          name?: string;
          trade_name?: string | null;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_district?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_postal_code?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      labor_rates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          hourly_cost: number;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          hourly_cost: number | string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          hourly_cost?: number | string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      material_categories: {
        Row: {
          id: string;
          code: string;
          name: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      material_price_history: {
        Row: {
          id: number;
          offer_id: string;
          supplier_id: string;
          material_id: string;
          change_type: string;
          purchase_unit_code: string;
          package_quantity: number;
          price: number;
          discount_percent: number;
          purchase_tax_percent: number;
          freight_per_unit: number | null;
          quoted_at: string;
          valid_until: string | null;
          recorded_at: string;
          recorded_by: string | null;
        };
        Insert: {
          id?: never;
          offer_id: string;
          supplier_id: string;
          material_id: string;
          change_type: string;
          purchase_unit_code: string;
          package_quantity: number | string;
          price: number | string;
          discount_percent: number | string;
          purchase_tax_percent: number | string;
          freight_per_unit?: number | string | null;
          quoted_at: string;
          valid_until?: string | null;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Update: {
          id?: never;
          offer_id?: string;
          supplier_id?: string;
          material_id?: string;
          change_type?: string;
          purchase_unit_code?: string;
          package_quantity?: number | string;
          price?: number | string;
          discount_percent?: number | string;
          purchase_tax_percent?: number | string;
          freight_per_unit?: number | string | null;
          quoted_at?: string;
          valid_until?: string | null;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "material_price_history_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_price_history_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "supplier_material_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_price_history_purchase_unit_code_fkey";
            columns: ["purchase_unit_code"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "material_price_history_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          id: string;
          internal_code: string;
          description: string;
          category_id: string;
          product_line_id: string | null;
          purchase_unit_code: string;
          consumption_unit_code: string;
          conversion_factor: number;
          commercial_length_mm: number | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          internal_code: string;
          description: string;
          category_id: string;
          product_line_id?: string | null;
          purchase_unit_code: string;
          consumption_unit_code: string;
          conversion_factor?: number | string;
          commercial_length_mm?: number | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          internal_code?: string;
          description?: string;
          category_id?: string;
          product_line_id?: string | null;
          purchase_unit_code?: string;
          consumption_unit_code?: string;
          conversion_factor?: number | string;
          commercial_length_mm?: number | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "material_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_consumption_unit_code_fkey";
            columns: ["consumption_unit_code"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "materials_product_line_id_fkey";
            columns: ["product_line_id"];
            isOneToOne: false;
            referencedRelation: "product_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_purchase_unit_code_fkey";
            columns: ["purchase_unit_code"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["code"];
          },
        ];
      };
      overhead_rates: {
        Row: {
          id: string;
          name: string;
          method: Database["public"]["Enums"]["overhead_method"];
          rate: number;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          method: Database["public"]["Enums"]["overhead_method"];
          rate: number | string;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          method?: Database["public"]["Enums"]["overhead_method"];
          rate?: number | string;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      product_components: {
        Row: {
          id: string;
          product_version_id: string;
          position: number;
          material_id: string;
          description: string | null;
          quantity_basis: Database["public"]["Enums"]["quantity_basis"];
          coefficient: number;
          offset_mm: number;
          waste_percent: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          product_version_id: string;
          position?: number;
          material_id: string;
          description?: string | null;
          quantity_basis: Database["public"]["Enums"]["quantity_basis"];
          coefficient: number | string;
          offset_mm?: number | string;
          waste_percent?: number | string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          product_version_id?: string;
          position?: number;
          material_id?: string;
          description?: string | null;
          quantity_basis?: Database["public"]["Enums"]["quantity_basis"];
          coefficient?: number | string;
          offset_mm?: number | string;
          waste_percent?: number | string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_components_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_components_product_version_id_fkey";
            columns: ["product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      product_labor_operations: {
        Row: {
          id: string;
          product_version_id: string;
          position: number;
          labor_rate_id: string;
          stage: Database["public"]["Enums"]["labor_stage"];
          description: string;
          time_basis: Database["public"]["Enums"]["quantity_basis"];
          minutes: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          product_version_id: string;
          position?: number;
          labor_rate_id: string;
          stage?: Database["public"]["Enums"]["labor_stage"];
          description: string;
          time_basis?: Database["public"]["Enums"]["quantity_basis"];
          minutes: number | string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          product_version_id?: string;
          position?: number;
          labor_rate_id?: string;
          stage?: Database["public"]["Enums"]["labor_stage"];
          description?: string;
          time_basis?: Database["public"]["Enums"]["quantity_basis"];
          minutes?: number | string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_labor_operations_labor_rate_id_fkey";
            columns: ["labor_rate_id"];
            isOneToOne: false;
            referencedRelation: "labor_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_labor_operations_product_version_id_fkey";
            columns: ["product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      product_lines: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      product_versions: {
        Row: {
          id: string;
          product_id: string;
          version_number: number;
          status: Database["public"]["Enums"]["product_version_status"];
          change_summary: string | null;
          min_width_mm: number | null;
          max_width_mm: number | null;
          min_height_mm: number | null;
          max_height_mm: number | null;
          notes: string | null;
          published_at: string | null;
          published_by: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          version_number: number;
          status?: Database["public"]["Enums"]["product_version_status"];
          change_summary?: string | null;
          min_width_mm?: number | null;
          max_width_mm?: number | null;
          min_height_mm?: number | null;
          max_height_mm?: number | null;
          notes?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          version_number?: number;
          status?: Database["public"]["Enums"]["product_version_status"];
          change_summary?: string | null;
          min_width_mm?: number | null;
          max_width_mm?: number | null;
          min_height_mm?: number | null;
          max_height_mm?: number | null;
          notes?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          code: string;
          name: string;
          category_id: string;
          product_line_id: string | null;
          description: string | null;
          requires_dimensions: boolean;
          is_custom_size: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          category_id: string;
          product_line_id?: string | null;
          description?: string | null;
          requires_dimensions?: boolean;
          is_custom_size?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          category_id?: string;
          product_line_id?: string | null;
          description?: string | null;
          requires_dimensions?: boolean;
          is_custom_size?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_product_line_id_fkey";
            columns: ["product_line_id"];
            isOneToOne: false;
            referencedRelation: "product_lines";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: Database["public"]["Enums"]["app_role"];
          active: boolean;
          max_discount_percent: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          active?: boolean;
          max_discount_percent?: number | string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          active?: boolean;
          max_discount_percent?: number | string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      quote_cost_snapshots: {
        Row: {
          id: string;
          quote_id: string;
          sequence: number;
          engine_version: string;
          calculated_at: string;
          calculated_by: string | null;
          target_margin_percent: number;
          discount_percent: number;
          sale_deductions_percent: number;
          freight_amount: number;
          other_costs_amount: number;
          material_cost: number;
          labor_cost: number;
          installation_cost: number;
          item_extra_cost: number;
          freight_cost: number;
          other_cost: number;
          overhead_cost: number;
          variable_cost: number;
          total_cost: number;
          purchase_need_cost: number;
          list_price: number;
          discount_amount: number;
          final_price: number;
          sale_deductions_amount: number;
          contribution_margin: number;
          contribution_margin_percent: number;
          net_profit: number;
          net_margin_percent: number;
          warnings: string[];
        };
        Insert: {
          id?: string;
          quote_id: string;
          sequence: number;
          engine_version: string;
          calculated_at?: string;
          calculated_by?: string | null;
          target_margin_percent: number | string;
          discount_percent: number | string;
          sale_deductions_percent: number | string;
          freight_amount: number | string;
          other_costs_amount: number | string;
          material_cost: number | string;
          labor_cost: number | string;
          installation_cost: number | string;
          item_extra_cost: number | string;
          freight_cost: number | string;
          other_cost: number | string;
          overhead_cost: number | string;
          variable_cost: number | string;
          total_cost: number | string;
          purchase_need_cost: number | string;
          list_price: number | string;
          discount_amount: number | string;
          final_price: number | string;
          sale_deductions_amount: number | string;
          contribution_margin: number | string;
          contribution_margin_percent: number | string;
          net_profit: number | string;
          net_margin_percent: number | string;
          warnings?: string[];
        };
        Update: {
          id?: string;
          quote_id?: string;
          sequence?: number;
          engine_version?: string;
          calculated_at?: string;
          calculated_by?: string | null;
          target_margin_percent?: number | string;
          discount_percent?: number | string;
          sale_deductions_percent?: number | string;
          freight_amount?: number | string;
          other_costs_amount?: number | string;
          material_cost?: number | string;
          labor_cost?: number | string;
          installation_cost?: number | string;
          item_extra_cost?: number | string;
          freight_cost?: number | string;
          other_cost?: number | string;
          overhead_cost?: number | string;
          variable_cost?: number | string;
          total_cost?: number | string;
          purchase_need_cost?: number | string;
          list_price?: number | string;
          discount_amount?: number | string;
          final_price?: number | string;
          sale_deductions_amount?: number | string;
          contribution_margin?: number | string;
          contribution_margin_percent?: number | string;
          net_profit?: number | string;
          net_margin_percent?: number | string;
          warnings?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "quote_cost_snapshots_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          position: number;
          product_id: string;
          product_version_id: string;
          description: string | null;
          width_mm: number | null;
          height_mm: number | null;
          quantity: number;
          include_installation: boolean;
          extra_cost: number;
          extra_cost_description: string | null;
          notes: string | null;
          unit_cost: number | null;
          total_cost: number | null;
          unit_price: number | null;
          total_price: number | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          quote_id: string;
          position?: number;
          product_id: string;
          product_version_id: string;
          description?: string | null;
          width_mm?: number | null;
          height_mm?: number | null;
          quantity: number | string;
          include_installation?: boolean;
          extra_cost?: number | string;
          extra_cost_description?: string | null;
          notes?: string | null;
          unit_cost?: number | string | null;
          total_cost?: number | string | null;
          unit_price?: number | string | null;
          total_price?: number | string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          quote_id?: string;
          position?: number;
          product_id?: string;
          product_version_id?: string;
          description?: string | null;
          width_mm?: number | null;
          height_mm?: number | null;
          quantity?: number | string;
          include_installation?: boolean;
          extra_cost?: number | string;
          extra_cost_description?: string | null;
          notes?: string | null;
          unit_cost?: number | string | null;
          total_cost?: number | string | null;
          unit_price?: number | string | null;
          total_price?: number | string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_product_version_id_fkey";
            columns: ["product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_snapshot_items: {
        Row: {
          id: string;
          snapshot_id: string;
          quote_item_id: string;
          position: number;
          product_id: string;
          product_version_id: string;
          product_code: string;
          product_name: string;
          version_number: number;
          description: string | null;
          width_mm: number | null;
          height_mm: number | null;
          quantity: number;
          area_m2: number | null;
          perimeter_m: number | null;
          include_installation: boolean;
          material_cost: number;
          labor_cost: number;
          installation_cost: number;
          extra_cost: number;
          allocated_freight: number;
          allocated_other_cost: number;
          overhead_cost: number;
          total_cost: number;
          unit_cost: number;
          unit_list_price: number;
          total_list_price: number;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          quote_item_id: string;
          position: number;
          product_id: string;
          product_version_id: string;
          product_code: string;
          product_name: string;
          version_number: number;
          description?: string | null;
          width_mm?: number | null;
          height_mm?: number | null;
          quantity: number | string;
          area_m2?: number | string | null;
          perimeter_m?: number | string | null;
          include_installation: boolean;
          material_cost: number | string;
          labor_cost: number | string;
          installation_cost: number | string;
          extra_cost: number | string;
          allocated_freight: number | string;
          allocated_other_cost: number | string;
          overhead_cost: number | string;
          total_cost: number | string;
          unit_cost: number | string;
          unit_list_price: number | string;
          total_list_price: number | string;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          quote_item_id?: string;
          position?: number;
          product_id?: string;
          product_version_id?: string;
          product_code?: string;
          product_name?: string;
          version_number?: number;
          description?: string | null;
          width_mm?: number | null;
          height_mm?: number | null;
          quantity?: number | string;
          area_m2?: number | string | null;
          perimeter_m?: number | string | null;
          include_installation?: boolean;
          material_cost?: number | string;
          labor_cost?: number | string;
          installation_cost?: number | string;
          extra_cost?: number | string;
          allocated_freight?: number | string;
          allocated_other_cost?: number | string;
          overhead_cost?: number | string;
          total_cost?: number | string;
          unit_cost?: number | string;
          unit_list_price?: number | string;
          total_list_price?: number | string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_snapshot_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_items_product_version_id_fkey";
            columns: ["product_version_id"];
            isOneToOne: false;
            referencedRelation: "product_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_items_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "quote_cost_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_snapshot_lines: {
        Row: {
          id: string;
          snapshot_id: string;
          snapshot_item_id: string | null;
          line_type: Database["public"]["Enums"]["snapshot_line_type"];
          description: string;
          material_id: string | null;
          supplier_id: string | null;
          offer_id: string | null;
          labor_rate_id: string | null;
          overhead_rate_id: string | null;
          sale_deduction_rate_id: string | null;
          product_component_id: string | null;
          material_code: string | null;
          supplier_name: string | null;
          quantity_basis: Database["public"]["Enums"]["quantity_basis"] | null;
          unit_code: string | null;
          quantity_net: number | null;
          waste_percent: number | null;
          quantity_gross: number | null;
          unit_cost: number | null;
          rate: number | null;
          amount: number;
          price_quoted_at: string | null;
          price_valid_until: string | null;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          snapshot_item_id?: string | null;
          line_type: Database["public"]["Enums"]["snapshot_line_type"];
          description: string;
          material_id?: string | null;
          supplier_id?: string | null;
          offer_id?: string | null;
          labor_rate_id?: string | null;
          overhead_rate_id?: string | null;
          sale_deduction_rate_id?: string | null;
          product_component_id?: string | null;
          material_code?: string | null;
          supplier_name?: string | null;
          quantity_basis?: Database["public"]["Enums"]["quantity_basis"] | null;
          unit_code?: string | null;
          quantity_net?: number | string | null;
          waste_percent?: number | string | null;
          quantity_gross?: number | string | null;
          unit_cost?: number | string | null;
          rate?: number | string | null;
          amount: number | string;
          price_quoted_at?: string | null;
          price_valid_until?: string | null;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          snapshot_item_id?: string | null;
          line_type?: Database["public"]["Enums"]["snapshot_line_type"];
          description?: string;
          material_id?: string | null;
          supplier_id?: string | null;
          offer_id?: string | null;
          labor_rate_id?: string | null;
          overhead_rate_id?: string | null;
          sale_deduction_rate_id?: string | null;
          product_component_id?: string | null;
          material_code?: string | null;
          supplier_name?: string | null;
          quantity_basis?: Database["public"]["Enums"]["quantity_basis"] | null;
          unit_code?: string | null;
          quantity_net?: number | string | null;
          waste_percent?: number | string | null;
          quantity_gross?: number | string | null;
          unit_cost?: number | string | null;
          rate?: number | string | null;
          amount?: number | string;
          price_quoted_at?: string | null;
          price_valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quote_snapshot_lines_labor_rate_id_fkey";
            columns: ["labor_rate_id"];
            isOneToOne: false;
            referencedRelation: "labor_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "supplier_material_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_overhead_rate_id_fkey";
            columns: ["overhead_rate_id"];
            isOneToOne: false;
            referencedRelation: "overhead_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_sale_deduction_rate_id_fkey";
            columns: ["sale_deduction_rate_id"];
            isOneToOne: false;
            referencedRelation: "sale_deduction_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "quote_cost_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_snapshot_item_id_fkey";
            columns: ["snapshot_item_id"];
            isOneToOne: false;
            referencedRelation: "quote_snapshot_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_lines_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_snapshot_purchase_needs: {
        Row: {
          id: string;
          snapshot_id: string;
          material_id: string;
          material_code: string;
          material_description: string;
          consumption_unit_code: string;
          gross_consumption: number;
          offer_id: string | null;
          supplier_id: string | null;
          supplier_name: string | null;
          purchase_unit_code: string;
          units_per_purchase: number;
          purchase_quantity: number;
          purchase_unit_cost: number;
          purchase_cost: number;
          leftover_quantity: number;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          material_id: string;
          material_code: string;
          material_description: string;
          consumption_unit_code: string;
          gross_consumption: number | string;
          offer_id?: string | null;
          supplier_id?: string | null;
          supplier_name?: string | null;
          purchase_unit_code: string;
          units_per_purchase: number | string;
          purchase_quantity: number | string;
          purchase_unit_cost: number | string;
          purchase_cost: number | string;
          leftover_quantity: number | string;
        };
        Update: {
          id?: string;
          snapshot_id?: string;
          material_id?: string;
          material_code?: string;
          material_description?: string;
          consumption_unit_code?: string;
          gross_consumption?: number | string;
          offer_id?: string | null;
          supplier_id?: string | null;
          supplier_name?: string | null;
          purchase_unit_code?: string;
          units_per_purchase?: number | string;
          purchase_quantity?: number | string;
          purchase_unit_cost?: number | string;
          purchase_cost?: number | string;
          leftover_quantity?: number | string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_snapshot_purchase_needs_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_purchase_needs_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "supplier_material_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_purchase_needs_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "quote_cost_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_snapshot_purchase_needs_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          id: string;
          number: number;
          customer_id: string;
          status: Database["public"]["Enums"]["quote_status"];
          title: string | null;
          issue_date: string;
          valid_until: string | null;
          target_margin_percent: number;
          discount_percent: number;
          freight_amount: number;
          other_costs_amount: number;
          other_costs_description: string | null;
          payment_terms: string | null;
          delivery_terms: string | null;
          customer_notes: string | null;
          internal_notes: string | null;
          current_snapshot_id: string | null;
          total_cost: number | null;
          list_price: number | null;
          discount_amount: number | null;
          total_price: number | null;
          contribution_margin: number | null;
          net_profit: number | null;
          net_margin_percent: number | null;
          calculated_at: string | null;
          sent_at: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          number?: never;
          customer_id: string;
          status?: Database["public"]["Enums"]["quote_status"];
          title?: string | null;
          issue_date?: string;
          valid_until?: string | null;
          target_margin_percent: number | string;
          discount_percent?: number | string;
          freight_amount?: number | string;
          other_costs_amount?: number | string;
          other_costs_description?: string | null;
          payment_terms?: string | null;
          delivery_terms?: string | null;
          customer_notes?: string | null;
          internal_notes?: string | null;
          current_snapshot_id?: string | null;
          total_cost?: number | string | null;
          list_price?: number | string | null;
          discount_amount?: number | string | null;
          total_price?: number | string | null;
          contribution_margin?: number | string | null;
          net_profit?: number | string | null;
          net_margin_percent?: number | string | null;
          calculated_at?: string | null;
          sent_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          number?: never;
          customer_id?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          title?: string | null;
          issue_date?: string;
          valid_until?: string | null;
          target_margin_percent?: number | string;
          discount_percent?: number | string;
          freight_amount?: number | string;
          other_costs_amount?: number | string;
          other_costs_description?: string | null;
          payment_terms?: string | null;
          delivery_terms?: string | null;
          customer_notes?: string | null;
          internal_notes?: string | null;
          current_snapshot_id?: string | null;
          total_cost?: number | string | null;
          list_price?: number | string | null;
          discount_amount?: number | string | null;
          total_price?: number | string | null;
          contribution_margin?: number | string | null;
          net_profit?: number | string | null;
          net_margin_percent?: number | string | null;
          calculated_at?: string | null;
          sent_at?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_current_snapshot_fk";
            columns: ["current_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "quote_cost_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_deduction_rates: {
        Row: {
          id: string;
          name: string;
          kind: Database["public"]["Enums"]["sale_deduction_kind"];
          percent: number;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          kind: Database["public"]["Enums"]["sale_deduction_kind"];
          percent: number | string;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: Database["public"]["Enums"]["sale_deduction_kind"];
          percent?: number | string;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      supplier_contacts: {
        Row: {
          id: string;
          supplier_id: string;
          name: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          name: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          name?: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_material_offers: {
        Row: {
          id: string;
          supplier_id: string;
          material_id: string;
          supplier_item_code: string | null;
          purchase_unit_code: string;
          package_quantity: number;
          price: number;
          discount_percent: number;
          purchase_tax_percent: number;
          freight_per_unit: number | null;
          minimum_order_quantity: number | null;
          quoted_at: string;
          valid_until: string | null;
          is_preferred: boolean;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          material_id: string;
          supplier_item_code?: string | null;
          purchase_unit_code: string;
          package_quantity: number | string;
          price: number | string;
          discount_percent?: number | string;
          purchase_tax_percent?: number | string;
          freight_per_unit?: number | string | null;
          minimum_order_quantity?: number | string | null;
          quoted_at?: string;
          valid_until?: string | null;
          is_preferred?: boolean;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          material_id?: string;
          supplier_item_code?: string | null;
          purchase_unit_code?: string;
          package_quantity?: number | string;
          price?: number | string;
          discount_percent?: number | string;
          purchase_tax_percent?: number | string;
          freight_per_unit?: number | string | null;
          minimum_order_quantity?: number | string | null;
          quoted_at?: string;
          valid_until?: string | null;
          is_preferred?: boolean;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_material_offers_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_material_offers_purchase_unit_code_fkey";
            columns: ["purchase_unit_code"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "supplier_material_offers_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          legal_name: string;
          trade_name: string | null;
          cnpj: string | null;
          payment_terms: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          legal_name: string;
          trade_name?: string | null;
          cnpj?: string | null;
          payment_terms?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          legal_name?: string;
          trade_name?: string | null;
          cnpj?: string | null;
          payment_terms?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
      units: {
        Row: {
          code: string;
          name: string;
          symbol: string;
          dimension: Database["public"]["Enums"]["unit_dimension"];
          factor_to_base: number;
          active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          name: string;
          symbol: string;
          dimension: Database["public"]["Enums"]["unit_dimension"];
          factor_to_base: number | string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          name?: string;
          symbol?: string;
          dimension?: Database["public"]["Enums"]["unit_dimension"];
          factor_to_base?: number | string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_product_version_draft: { Args: { p_product_id: string; p_source_version_id?: string }; Returns: string };
      publish_product_version: { Args: { p_version_id: string; p_change_summary?: string }; Returns: undefined };
      save_quote_calculation: { Args: { p_quote_id: string; p_snapshot: Json; p_items: Json; p_lines: Json; p_purchase_needs: Json }; Returns: string };
    };
    Enums: {
      app_role: "admin" | "gestor" | "vendedor";
      labor_stage: "fabricacao" | "instalacao";
      overhead_method: "percentual_custo_direto" | "valor_por_hora_mo";
      person_type: "fisica" | "juridica";
      product_version_status: "rascunho" | "publicada" | "arquivada";
      quantity_basis: "fixa" | "largura" | "altura" | "perimetro" | "area";
      quote_status: "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado" | "cancelado";
      sale_deduction_kind: "tributo" | "comissao" | "taxa_financeira" | "outro";
      snapshot_line_type: "material" | "mao_de_obra" | "instalacao" | "custo_indireto" | "frete" | "outro_custo" | "deducao_venda";
      unit_dimension: "comprimento" | "area" | "volume" | "massa" | "unidade";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
