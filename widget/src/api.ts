import type { WidgetData } from './types';

/**
 * ウィジェット表示データを取得する
 * GET /api/widgets/:id/data
 */
export async function fetchWidgetData(
  apiBase: string,
  widgetId: string
): Promise<WidgetData> {
  const res = await fetch(`${apiBase}/api/widgets/${widgetId}/data`);
  if (!res.ok) {
    throw new Error(`[Koe] Failed to fetch widget data: ${res.status}`);
  }
  return res.json() as Promise<WidgetData>;
}
