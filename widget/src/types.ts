/** ウィジェット設定 */
export interface WidgetConfig {
  theme: 'light' | 'dark';
  show_rating: boolean;
  show_date: boolean;
  show_avatar: boolean;
  max_items: number;
  columns: number;
  border_radius: number;
  shadow: boolean;
  font_family: string;
}

/** テスティモニアル公開データ（author_email なし） */
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

/** ウィジェット表示用データ（API レスポンス） */
export interface WidgetData {
  widget: {
    type: 'wall' | 'carousel' | 'list';
    config: WidgetConfig;
  };
  testimonials: TestimonialPublic[];
  plan: 'free' | 'pro';
}
