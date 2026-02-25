# Koe - Stripe 連携仕様書

## 目次

1. [Stripe 側の設定](#1-stripe-側の設定)
2. [課金フロー](#2-課金フロー)
3. [Webhook 処理](#3-webhook-処理)
4. [API 設計（詳細）](#4-api-設計詳細)
5. [環境変数](#5-環境変数)
6. [テスト戦略](#6-テスト戦略)
7. [注意点](#7-注意点)

---

## 1. Stripe 側の設定

### 1.1 Product / Price の作成

Stripe Dashboard または API で以下を作成する。

**Product:**

| 項目 | 値 |
|---|---|
| Name | Koe Pro |
| Description | テスティモニアル収集・管理の全機能をアンロック |

**Price:**

| 項目 | 値 |
|---|---|
| Currency | JPY |
| Amount | 980 |
| Billing period | Monthly (recurring) |
| Usage type | Licensed |

Stripe CLI での作成コマンド:

```bash
# Product 作成
stripe products create \
  --name="Koe Pro" \
  --description="テスティモニアル収集・管理の全機能をアンロック"

# Price 作成（上記で返された prod_xxx を使用）
stripe prices create \
  --product="prod_xxx" \
  --currency=jpy \
  --unit-amount=980 \
  --recurring-interval=month
```

作成後、Price ID (`price_xxx`) を環境変数 `STRIPE_PRO_PRICE_ID` として保存する。

### 1.2 Customer Portal の設定

Stripe Dashboard > Settings > Billing > Customer portal で以下を設定する。

| 設定項目 | 値 |
|---|---|
| Subscriptions > Cancel subscriptions | 有効 |
| Subscriptions > Cancel mode | At end of billing period（期間終了時にキャンセル） |
| Subscriptions > Switch plans | 無効（Pro のみのため不要） |
| Payment methods > Update payment methods | 有効 |
| Invoices > Invoice history | 有効 |
| Business information > Terms of service | Koe 利用規約 URL |
| Business information > Privacy policy | Koe プライバシーポリシー URL |

重要: Cancel mode は必ず "At end of billing period" に設定する。即時キャンセルにすると、支払い済み期間の利用権が失われユーザー体験が悪化する。

### 1.3 Webhook エンドポイントの登録

Stripe Dashboard > Developers > Webhooks で登録する。

| 項目 | 値 |
|---|---|
| Endpoint URL | `https://<domain>/api/webhooks/stripe` |
| API version | 最新の安定版 |
| Events | 下記参照 |

**登録すべきイベント一覧:**

| イベント | 用途 |
|---|---|
| `checkout.session.completed` | Checkout 完了後のサブスクリプション作成 |
| `customer.subscription.created` | サブスクリプション作成の補完（安全策） |
| `customer.subscription.updated` | プラン変更、ステータス変更の同期 |
| `customer.subscription.deleted` | サブスクリプション終了時の Free 戻し |
| `invoice.payment_failed` | 支払い失敗時の通知・ステータス更新 |
| `invoice.payment_succeeded` | 支払い成功時の period_end 更新 |

Webhook Signing Secret (`whsec_xxx`) を環境変数 `STRIPE_WEBHOOK_SECRET` として保存する。

---

## 2. 課金フロー

### 2.1 Free -> Pro アップグレードフロー

```
ユーザー              Koe Frontend           Koe API                 Stripe
  |                      |                      |                      |
  |  「Proにアップグレード」  |                      |                      |
  |  クリック             |                      |                      |
  |--------------------->|                      |                      |
  |                      | POST /api/billing/   |                      |
  |                      |   checkout            |                      |
  |                      |--------------------->|                      |
  |                      |                      | Supabase: user取得     |
  |                      |                      | stripe_customer_id    |
  |                      |                      | が無ければ             |
  |                      |                      | stripe.customers.     |
  |                      |                      |   create()            |
  |                      |                      |--------------------->|
  |                      |                      |<---------------------|
  |                      |                      | stripe_customer_id    |
  |                      |                      |   をusersに保存        |
  |                      |                      |                      |
  |                      |                      | stripe.checkout.      |
  |                      |                      |   sessions.create()   |
  |                      |                      |--------------------->|
  |                      |                      |<---------------------|
  |                      |                      | session.url           |
  |                      |<---------------------|                      |
  |                      | { url: session.url } |                      |
  |  リダイレクト          |                      |                      |
  |<---------------------|                      |                      |
  |                      |                      |                      |
  |  Stripe Checkout     |                      |                      |
  |  ページで支払い        |                      |                      |
  |--------------------------------------------->|                      |
  |                      |                      |                      |
  |  支払い完了           |                      |                      |
  |  success_url へ       |                      |                      |
  |  リダイレクト          |                      |                      |
  |<---------------------------------------------|                      |
  |                      |                      |                      |
  |                      |                      | Webhook:              |
  |                      |                      | checkout.session.     |
  |                      |                      |   completed           |
  |                      |                      |<---------------------|
  |                      |                      | 1. subscriptions      |
  |                      |                      |    INSERT             |
  |                      |                      | 2. users.plan =      |
  |                      |                      |    'pro'              |
  |                      |                      |----> Supabase        |
  |                      |                      |                      |
  |                      |                      | 200 OK               |
  |                      |                      |--------------------->|
```

### 2.2 Pro -> Free ダウングレード（キャンセル）フロー

```
ユーザー              Koe Frontend           Koe API                 Stripe
  |                      |                      |                      |
  |  「プランを管理」      |                      |                      |
  |  クリック             |                      |                      |
  |--------------------->|                      |                      |
  |                      | POST /api/billing/   |                      |
  |                      |   portal              |                      |
  |                      |--------------------->|                      |
  |                      |                      | stripe.billingPortal. |
  |                      |                      |   sessions.create()   |
  |                      |                      |--------------------->|
  |                      |                      |<---------------------|
  |                      |                      | session.url           |
  |                      |<---------------------|                      |
  |  リダイレクト          |                      |                      |
  |<---------------------|                      |                      |
  |                      |                      |                      |
  |  Customer Portal で   |                      |                      |
  |  「サブスクリプション    |                      |                      |
  |   をキャンセル」        |                      |                      |
  |--------------------------------------------->|                      |
  |                      |                      |                      |
  |                      |                      | Webhook:              |
  |                      |                      | customer.subscription |
  |                      |                      |   .updated            |
  |                      |                      |<---------------------|
  |                      |                      | cancel_at_period_end  |
  |                      |                      |   = true              |
  |                      |                      | subscriptions.status  |
  |                      |                      |   = 'canceled'        |
  |                      |                      |                      |
  |  (current_period_end  |                      |                      |
  |   まで Pro 利用可能)   |                      |                      |
  |                      |                      |                      |
  |  --- 期間終了 ---     |                      |                      |
  |                      |                      |                      |
  |                      |                      | Webhook:              |
  |                      |                      | customer.subscription |
  |                      |                      |   .deleted            |
  |                      |                      |<---------------------|
  |                      |                      | users.plan = 'free'  |
  |                      |                      | subscriptions DELETE  |
  |                      |                      |   or status='deleted' |
```

### 2.3 支払い失敗時のフロー

```
  Stripe                Koe API                 Koe DB
  |                      |                      |
  | 自動更新の課金失敗     |                      |
  |                      |                      |
  | Webhook:             |                      |
  | invoice.payment_     |                      |
  |   failed             |                      |
  |--------------------->|                      |
  |                      | subscriptions.status  |
  |                      |   = 'past_due'        |
  |                      |--------------------->|
  |                      |                      |
  | (Stripe が自動で      |                      |
  |  Smart Retries 実行   |                      |
  |  最大3回リトライ)      |                      |
  |                      |                      |
  | --- リトライ成功 ---  |                      |
  | Webhook:             |                      |
  | invoice.payment_     |                      |
  |   succeeded          |                      |
  |--------------------->|                      |
  |                      | subscriptions.status  |
  |                      |   = 'active'          |
  |                      | current_period_end    |
  |                      |   更新                |
  |                      |--------------------->|
  |                      |                      |
  | --- 全リトライ失敗 --- |                      |
  | Webhook:             |                      |
  | customer.subscription|                      |
  |   .deleted           |                      |
  |--------------------->|                      |
  |                      | users.plan = 'free'  |
  |                      |--------------------->|
```

**Stripe Smart Retries 設定 (Dashboard > Settings > Billing > Subscriptions):**

| 項目 | 推奨値 |
|---|---|
| Retry schedule | Smart Retries（Stripe ML による最適タイミング） |
| Max retries | 3回 |
| Mark subscription as canceled after all retries fail | 有効 |
| Send email to customer on failed payment | 有効 |

### 2.4 Customer Portal での管理

Customer Portal でユーザーが実行可能な操作:

| 操作 | 発火するイベント | Koe 側の処理 |
|---|---|---|
| 支払い方法の更新 | なし（Koe 側処理不要） | - |
| サブスクリプションのキャンセル | `customer.subscription.updated` | status 更新 |
| 請求履歴の閲覧 | なし（Stripe 側で完結） | - |

---

## 3. Webhook 処理

### 3.1 イベント処理一覧

#### `checkout.session.completed`

```typescript
// /app/api/webhooks/stripe/route.ts 内の処理

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !subscriptionId) {
    console.error('Missing metadata in checkout session', { sessionId: session.id });
    return;
  }

  // Stripe からサブスクリプション詳細を取得
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const supabase = createServiceRoleClient();

  // トランザクション的に処理（Supabase は単一テーブル操作が基本なので順次実行）
  // 1. subscriptions テーブルに INSERT
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      plan: 'pro',
      status: 'active',
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (subError) {
    console.error('Failed to upsert subscription', subError);
    throw subError;
  }

  // 2. users テーブルの plan と stripe_customer_id を更新
  const { error: userError } = await supabase
    .from('users')
    .update({
      plan: 'pro',
      stripe_customer_id: customerId,
    })
    .eq('id', userId);

  if (userError) {
    console.error('Failed to update user plan', userError);
    throw userError;
  }

  console.info('Checkout completed', { userId, subscriptionId });
}
```

#### `customer.subscription.updated`

```typescript
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const supabase = createServiceRoleClient();

  // Koe 側のステータスにマッピング
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',    // cancel_at_period_end = true の場合
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    trialing: 'active',
    paused: 'canceled',
  };

  const mappedStatus = statusMap[subscription.status] ?? 'canceled';

  // subscriptions テーブルを更新
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: mappedStatus,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription', error);
    throw error;
  }

  // cancel_at_period_end が true の場合、まだ期間内なので plan は変更しない
  // plan の変更は customer.subscription.deleted で行う
  if (subscription.cancel_at_period_end) {
    console.info('Subscription set to cancel at period end', {
      subscriptionId: subscription.id,
      cancelAt: subscription.cancel_at,
    });
  }
}
```

#### `customer.subscription.deleted`

```typescript
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = createServiceRoleClient();

  // subscriptions テーブルからユーザーを特定
  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (fetchError || !sub) {
    console.error('Subscription not found in DB', {
      stripeSubscriptionId: subscription.id,
    });
    return;
  }

  // 1. users.plan を free に戻す
  const { error: userError } = await supabase
    .from('users')
    .update({ plan: 'free' })
    .eq('id', sub.user_id);

  if (userError) {
    console.error('Failed to downgrade user plan', userError);
    throw userError;
  }

  // 2. subscriptions レコードを論理削除（status を deleted に）
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({ status: 'deleted' })
    .eq('stripe_subscription_id', subscription.id);

  if (subError) {
    console.error('Failed to mark subscription as deleted', subError);
    throw subError;
  }

  console.info('Subscription deleted, user downgraded to free', {
    userId: sub.user_id,
  });
}
```

#### `invoice.payment_failed`

```typescript
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    // one-off invoice の場合は無視
    return;
  }

  const supabase = createServiceRoleClient();

  // subscriptions テーブルの status を past_due に
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to update subscription status to past_due', error);
    throw error;
  }

  // ユーザーへの通知（将来的にメール通知を追加）
  // 現時点では管理画面でバナー表示するために past_due ステータスを利用
  console.warn('Payment failed', {
    subscriptionId,
    invoiceId: invoice.id,
    attemptCount: invoice.attempt_count,
  });
}
```

#### `invoice.payment_succeeded`

```typescript
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  const supabase = createServiceRoleClient();

  // Stripe からサブスクリプション最新情報を取得
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to update subscription after payment success', error);
    throw error;
  }
}
```

### 3.2 Webhook 署名検証と処理のメインハンドラ

```typescript
// /app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Next.js App Router では bodyParser を無効化する必要がある
// route.ts に以下の export を追加
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // 1. 署名検証
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // 2. 冪等性チェック（同一イベントの重複処理を防ぐ）
  const isProcessed = await checkEventProcessed(event.id);
  if (isProcessed) {
    console.info('Event already processed, skipping', { eventId: event.id });
    return NextResponse.json({ received: true });
  }

  // 3. イベントタイプに応じた処理
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'customer.subscription.created':
        // checkout.session.completed で処理済みの場合が多いが、
        // 安全策として subscription.updated と同じ処理を実行
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        console.info('Unhandled event type', { type: event.type });
    }

    // 4. 処理済みイベントを記録
    await markEventProcessed(event.id);

  } catch (error) {
    console.error('Webhook handler failed', {
      eventType: event.type,
      eventId: event.id,
      error,
    });
    // Stripe に 500 を返すとリトライしてくれる
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
```

### 3.3 冪等性管理テーブル

Webhook イベントの重複処理を防ぐために `stripe_events` テーブルを使用する。

```sql
-- Supabase SQL Editor で実行
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,           -- Stripe event ID (evt_xxx)
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 古いレコードの自動削除（30日以上経過したもの）
-- Supabase の pg_cron を利用
SELECT cron.schedule(
  'cleanup-stripe-events',
  '0 3 * * *',  -- 毎日 AM3:00
  $$DELETE FROM stripe_events WHERE processed_at < NOW() - INTERVAL '30 days'$$
);
```

```typescript
// 冪等性チェック用ヘルパー関数

import { createServiceRoleClient } from '@/lib/supabase/server';

async function checkEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .single();

  return !!data;
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from('stripe_events')
    .insert({ id: eventId, type: eventType });
}
```

---

## 4. API 設計（詳細）

### 4.1 POST /api/billing/checkout

Stripe Checkout Session を作成し、Checkout ページの URL を返す。

**認証:** 必須（Supabase Auth JWT）

**リクエスト:**

```
POST /api/billing/checkout
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

// リクエストボディは不要（プランが Pro 1つのみのため）
{}
```

**レスポンス（成功 200）:**

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx..."
}
```

**レスポンス（エラー）:**

```json
// 401 未認証
{ "error": "Unauthorized" }

// 400 既に Pro プラン
{ "error": "Already subscribed to Pro plan" }

// 500 Stripe API エラー
{ "error": "Failed to create checkout session" }
```

**処理フロー:**

```typescript
// /app/api/billing/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. ユーザー情報取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('plan, stripe_customer_id, email')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // 3. 既に Pro の場合は拒否
  if (userData.plan === 'pro') {
    return NextResponse.json(
      { error: 'Already subscribed to Pro plan' },
      { status: 400 }
    );
  }

  try {
    // 4. Stripe Customer がなければ作成
    let customerId = userData.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email ?? user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // stripe_customer_id を保存
      // Service Role Client を使用（RLS バイパスが必要な場合）
      const serviceSupabase = createServiceRoleClient();
      await serviceSupabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 5. Checkout Session 作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
      // 日本語ロケール
      locale: 'ja',
      // 税金の自動計算を有効にする場合
      // automatic_tax: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create checkout session', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### 4.2 POST /api/billing/portal

Stripe Customer Portal のセッションを作成し、Portal ページの URL を返す。

**認証:** 必須（Supabase Auth JWT）

**リクエスト:**

```
POST /api/billing/portal
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{}
```

**レスポンス（成功 200）:**

```json
{
  "url": "https://billing.stripe.com/p/session/xxx..."
}
```

**レスポンス（エラー）:**

```json
// 401 未認証
{ "error": "Unauthorized" }

// 400 Stripe Customer が未作成
{ "error": "No billing account found. Please subscribe first." }

// 500 Stripe API エラー
{ "error": "Failed to create portal session" }
```

**処理フロー:**

```typescript
// /app/api/billing/portal/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. stripe_customer_id 取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe first.' },
      { status: 400 }
    );
  }

  try {
    // 3. Customer Portal セッション作成
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Failed to create portal session', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

### 4.3 POST /api/webhooks/stripe

Stripe Webhook イベントを受信・処理する。詳細は [3. Webhook 処理](#3-webhook-処理) を参照。

**認証:** Stripe 署名検証（`stripe-signature` ヘッダー）

**リクエスト:**

```
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: t=xxx,v1=xxx,...

<raw request body>
```

**レスポンス:**

```json
// 成功
{ "received": true }

// 署名検証失敗
{ "error": "Webhook Error: ..." }  // 400

// 処理失敗（Stripe がリトライ）
{ "error": "Webhook handler failed" }  // 500
```

**重要: Next.js App Router での raw body 取得について**

Webhook の署名検証には raw body（パースされていない文字列）が必要。App Router の Route Handler では `request.text()` で取得する。

```typescript
// Next.js App Router では bodyParser の無効化は不要
// request.text() で raw body を取得できる
const body = await request.text();
```

---

## 5. 環境変数

### 5.1 必要な環境変数一覧

| 変数名 | 説明 | 例 |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API シークレットキー | `sk_test_xxx` / `sk_live_xxx` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe API パブリッシャブルキー（フロントエンド用） | `pk_test_xxx` / `pk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Webhook 署名検証用シークレット | `whsec_xxx` |
| `STRIPE_PRO_PRICE_ID` | Pro プランの Price ID | `price_xxx` |
| `NEXT_PUBLIC_APP_URL` | アプリケーションの公開 URL | `https://koe.example.com` |

### 5.2 テスト環境と本番環境の切り替え

Stripe はテスト環境と本番環境で別のキーを発行する。環境変数の値を切り替えることで対応する。

| 環境 | STRIPE_SECRET_KEY | STRIPE_PUBLISHABLE_KEY | STRIPE_WEBHOOK_SECRET | STRIPE_PRO_PRICE_ID |
|---|---|---|---|---|
| ローカル開発 | `sk_test_xxx` | `pk_test_xxx` | `whsec_xxx`（Stripe CLI 発行） | `price_xxx`（テスト） |
| Vercel Preview | `sk_test_xxx` | `pk_test_xxx` | `whsec_xxx`（テスト用 Webhook） | `price_xxx`（テスト） |
| Vercel Production | `sk_live_xxx` | `pk_live_xxx` | `whsec_xxx`（本番用 Webhook） | `price_xxx`（本番） |

**Vercel での設定:**

```bash
# Vercel CLI で環境変数を設定
vercel env add STRIPE_SECRET_KEY        # Production / Preview / Development それぞれ設定
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRO_PRICE_ID
```

**ローカル `.env.local`:**

```env
# Stripe（テスト環境）
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

重要: `.env.local` は `.gitignore` に必ず含めること。

---

## 6. テスト戦略

### 6.1 Stripe CLI を使ったローカル Webhook テスト

```bash
# 1. Stripe CLI のインストール（macOS）
brew install stripe/stripe-cli/stripe

# 2. Stripe アカウントにログイン
stripe login

# 3. Webhook のローカル転送を開始
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# -> "Ready! Your webhook signing secret is whsec_xxx" が表示される
# -> この whsec_xxx を .env.local の STRIPE_WEBHOOK_SECRET にセット

# 4. テストイベントのトリガー（別ターミナル）
# Checkout 完了イベント
stripe trigger checkout.session.completed

# サブスクリプション更新イベント
stripe trigger customer.subscription.updated

# サブスクリプション削除イベント
stripe trigger customer.subscription.deleted

# 支払い失敗イベント
stripe trigger invoice.payment_failed
```

### 6.2 テストカード番号

| カード番号 | 用途 |
|---|---|
| `4242 4242 4242 4242` | 正常な支払い（Visa） |
| `4000 0000 0000 3220` | 3D セキュア認証が必要 |
| `4000 0000 0000 9995` | 支払い拒否（insufficient_funds） |
| `4000 0000 0000 0341` | カード追加は成功するが課金時に失敗 |
| `4000 0000 0000 0002` | カード拒否（generic_decline） |

全カード共通: 有効期限は将来の任意の日付、CVC は任意の3桁。

### 6.3 E2E テストシナリオ

以下のシナリオを手動またはテストスクリプトで検証する。

| # | シナリオ | 確認事項 |
|---|---|---|
| 1 | Free ユーザーが Checkout で Pro にアップグレード | users.plan = 'pro', subscriptions レコード作成 |
| 2 | Pro ユーザーが Customer Portal でキャンセル | subscriptions.status = 'canceled', period_end まで Pro 利用可能 |
| 3 | キャンセル済みサブスクリプションの期間終了 | users.plan = 'free', subscriptions.status = 'deleted' |
| 4 | 支払い失敗 | subscriptions.status = 'past_due', UI にバナー表示 |
| 5 | 支払い失敗後のリトライ成功 | subscriptions.status = 'active' に復帰 |
| 6 | 既に Pro のユーザーが checkout を叩く | 400 エラー |
| 7 | Webhook の重複イベント受信 | 2回目は処理スキップ（冪等性） |
| 8 | 不正な Webhook 署名 | 400 エラー、処理されない |

---

## 7. 注意点

### 7.1 Stripe アカウント凍結リスクへの備え

Stripe は事業内容が不明確なアカウントを凍結することがある。以下を事前に対策する。

**Stripe Dashboard での設定:**

- Business settings > Public details に以下を正確に記入:
  - **事業内容:** 「テスティモニアル（お客様の声）の収集・管理・表示を支援する SaaS。ユーザーはお客様の声を収集するフォームを作成し、ウェブサイトに埋め込むウィジェットとして表示する。」
  - **URL:** Koe のトップページ URL
  - **サポートメール/電話:** 有効な連絡先
- Terms of Service と Privacy Policy の URL を設定
- 利用規約に返金ポリシーを明記（月額サブスクリプションのため、未使用期間の日割り返金はなし等）

**コード側での対策:**

- Stripe Customer に `metadata` として `supabase_user_id` を必ず紐付ける
- 全トランザクションにログを残す
- 異常な課金パターン（短期間での大量サブスクリプション作成等）の監視

### 7.2 冪等性（Webhook の重複処理対策）

Stripe は Webhook の配信に "at least once" セマンティクスを採用している。同一イベントが複数回配信される可能性がある。

**対策:**

1. `stripe_events` テーブルで処理済みイベント ID を管理（3.3 節参照）
2. DB 操作は可能な限り `UPSERT` を使用し、同一データの再挿入を安全に処理
3. subscriptions テーブルの `user_id` にユニーク制約を設定（1ユーザー1サブスクリプション）

```sql
-- subscriptions テーブルのユニーク制約
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
```

### 7.3 Supabase との同期タイミング

**課題:** Webhook の処理完了前にユーザーが success_url にリダイレクトされ、UI に反映されていないケースがある。

**対策:**

```
方法 A（推奨）: Optimistic UI + Polling
  1. success_url にリダイレクト後、UI 上では「処理中...」を表示
  2. 数秒間ポーリングで users.plan を確認
  3. plan が 'pro' になったら UI を更新

方法 B: Checkout Session の直接確認
  1. success_url に session_id をクエリパラメータとして含める
  2. フロントエンドから API を叩いて session の status を確認
  3. status が 'complete' なら Stripe API からサブスクリプション情報を取得して DB 更新
```

**実装例（方法 A）:**

```typescript
// /app/dashboard/billing/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setIsLoading(true);
      // Webhook 処理完了を待つためにポーリング
      const interval = setInterval(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .single();

        if (data?.plan === 'pro') {
          setPlan('pro');
          setIsLoading(false);
          clearInterval(interval);
        }
      }, 2000); // 2秒間隔

      // 30秒後にタイムアウト
      setTimeout(() => {
        clearInterval(interval);
        setIsLoading(false);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [searchParams]);

  // ... UI レンダリング
}
```

### 7.4 プラン判定のロジック

ユーザーが Pro 機能を利用できるかの判定は、`users.plan` カラムを Single Source of Truth とする。

```typescript
// /lib/plan.ts

import { createClient } from '@/lib/supabase/server';

export async function getUserPlan(userId: string): Promise<'free' | 'pro'> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  return (data?.plan as 'free' | 'pro') ?? 'free';
}

export async function requirePro(userId: string): Promise<void> {
  const plan = await getUserPlan(userId);
  if (plan !== 'pro') {
    throw new Error('Pro plan required');
  }
}
```

**Free / Pro の機能制限:**

| 機能 | Free | Pro |
|---|---|---|
| プロジェクト数 | 1 | 無制限 |
| テスティモニアル数 / プロジェクト | 10 | 無制限 |
| ウィジェットの「Powered by Koe」バッジ | 表示（削除不可） | 非表示可 |
| ウィジェットタイプ | Wall of Love のみ | 全タイプ |
| カスタムブランドカラー | 不可 | 可 |

注: 上記の制限値は mvp-spec に明記がないため暫定値。実装前に確定すること。

### 7.5 セキュリティ考慮事項

1. **Webhook エンドポイントの保護:** 署名検証を必ず実行し、検証に失敗したリクエストは即座に 400 を返す
2. **Service Role Key の取り扱い:** Webhook ハンドラでは RLS をバイパスする必要があるため Service Role Key を使用するが、この key はサーバーサイドでのみ使用し、フロントエンドに絶対に露出させない
3. **Checkout Session の metadata:** `user_id` を metadata に含めることで Webhook 処理時にユーザーを特定する。この値はサーバーサイドで設定されるため改竄リスクはない
4. **レートリミット:** `/api/billing/checkout` と `/api/billing/portal` にレートリミットを適用する（1ユーザーあたり 10回/分 程度）

---

## 付録: DB マイグレーション

mvp-spec の subscriptions テーブルに加えて、冪等性管理用の `stripe_events` テーブルと、subscriptions の status に `deleted` を追加する。

```sql
-- 20240101000000_create_stripe_events.sql

-- 冪等性管理テーブル
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- subscriptions テーブルの status に 'deleted' を追加
-- （mvp-spec では active, canceled, past_due のみ）
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'deleted';

-- subscriptions の user_id にユニーク制約
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- stripe_events の自動クリーンアップ（pg_cron が利用可能な場合）
-- Supabase Dashboard > Database > Extensions で pg_cron を有効化後に実行
SELECT cron.schedule(
  'cleanup-stripe-events',
  '0 3 * * *',
  $$DELETE FROM stripe_events WHERE processed_at < NOW() - INTERVAL '30 days'$$
);
```

---

## 付録: Supabase Service Role Client の初期化

Webhook ハンドラなど、RLS をバイパスして DB 操作する必要がある箇所で使用する。

```typescript
// /lib/supabase/service-role.ts

import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```
