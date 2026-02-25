// ドメイン型定義（設計書 types/database.ts セクション準拠）

export type PlanType = "free" | "pro";
export type TestimonialStatus = "pending" | "approved" | "rejected";
export type WidgetType = "wall" | "carousel" | "list";
export type SubscriptionStatus = "active" | "canceled" | "past_due";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: PlanType;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  form_config: FormConfig;
  created_at: string;
  updated_at: string;
}

export interface FormConfig {
  fields: FormField[];
  thank_you_message: string;
}

export interface FormField {
  key: string;
  label: string;
  required: boolean;
}

export interface Testimonial {
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
}

export interface Widget {
  id: string;
  project_id: string;
  type: WidgetType;
  config: WidgetConfig;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  theme: "light" | "dark";
  show_rating: boolean;
  show_date: boolean;
  show_avatar: boolean;
  max_items: number;
  columns: number;
  border_radius: number;
  shadow: boolean;
  font_family: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

// 集約型
export interface ProjectWithCount extends Project {
  testimonial_count: number;
}

export interface UsageInfo {
  current: number;
  limit: number;
  isAtLimit: boolean;
}

// ウィジェット公開データ（author_email除外）
export interface TestimonialPublic {
  id: string;
  author_name: string;
  author_title: string | null;
  author_company: string | null;
  author_avatar_url: string | null;
  rating: number;
  content: string;
  created_at: string;
}

export interface WidgetData {
  widget: { type: WidgetType; config: WidgetConfig };
  testimonials: TestimonialPublic[];
  plan: PlanType; // バッジ表示判定用
}

// APIエラーレスポンス形式
export interface ApiError {
  error: string;
  code?: string;
}

// フィルター
export interface TestimonialFilters {
  status?: TestimonialStatus;
  rating?: number;
  tags?: string[];
}
