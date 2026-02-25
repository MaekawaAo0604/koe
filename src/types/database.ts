export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanType = "free" | "pro";
export type TestimonialStatus = "pending" | "approved" | "rejected";
export type WidgetType = "wall" | "carousel" | "list";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "deleted";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          plan: PlanType;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string;
          avatar_url?: string | null;
          plan?: PlanType;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          plan?: PlanType;
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          brand_color: string;
          form_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          brand_color?: string;
          form_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          brand_color?: string;
          form_config?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      testimonials: {
        Row: {
          id: string;
          project_id: string;
          status: TestimonialStatus;
          author_name: string;
          author_title: string | null;
          author_company: string | null;
          author_email: string | null;
          author_avatar_url: string | null;
          rating: number;
          content: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          status?: TestimonialStatus;
          author_name: string;
          author_title?: string | null;
          author_company?: string | null;
          author_email?: string | null;
          author_avatar_url?: string | null;
          rating: number;
          content: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          status?: TestimonialStatus;
          author_name?: string;
          author_title?: string | null;
          author_company?: string | null;
          author_email?: string | null;
          author_avatar_url?: string | null;
          rating?: number;
          content?: string;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "testimonials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      widgets: {
        Row: {
          id: string;
          project_id: string;
          type: WidgetType;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: WidgetType;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: WidgetType;
          config?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "widgets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          plan: PlanType;
          status: SubscriptionStatus;
          current_period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id: string;
          plan: PlanType;
          status: SubscriptionStatus;
          current_period_end: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string;
          plan?: PlanType;
          status?: SubscriptionStatus;
          current_period_end?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      plan_type: PlanType;
      testimonial_status: TestimonialStatus;
      widget_type: WidgetType;
      subscription_status: SubscriptionStatus;
    };
  };
}
