// Subscription Types for Daleel

export type PlanName = 'free' | 'premium' | 'team';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'trial';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentMethod = 'card' | 'vodafone_cash' | 'etisalat_cash' | 'orange_cash' | 'we_pay' | 'fawry';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  name_ar: string;
  name_en: string;
  display_name_ar: string;
  display_name_en: string;
  description_ar: string;
  description_en: string;
  price_monthly_egp: number;
  price_yearly_egp: number;
  price_one_time_egp?: number;
  payment_type?: 'recurring' | 'one_time';
  price_per_user_egp?: number;
  min_users?: number;
  features: string[];
  limitations: PlanLimitations;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

export interface PlanLimitations {
  max_paths: number;  // -1 for unlimited
  resources_per_milestone: number;
  monthly_hours: number;
  ai_requests: number;
  downloads: number;
}

export interface SubscriptionFeature {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  icon?: string;
  category: 'learning' | 'ai' | 'career' | 'community' | 'support' | 'team' | 'other';
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  started_at: string;
  current_period_start: string;
  current_period_end?: string;
  trial_ends_at?: string;
  paused_at?: string;
  cancelled_at?: string;
  payment_method?: PaymentMethod;
  price_locked_egp?: number;
  is_founders_club: boolean;
  team_id?: string;
  is_team_admin: boolean;
}

export interface SubscriptionUsage {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  paths_accessed: number;
  resources_viewed: number;
  learning_minutes: number;
  ai_requests: number;
  downloads: number;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount_egp: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: 'subscription' | 'renewal' | 'upgrade' | 'refund';
  payment_method?: PaymentMethod;
  payment_provider: string;
  provider_transaction_id?: string;
  description?: string;
  invoice_url?: string;
  receipt_url?: string;
  created_at: string;
}

export interface SubscriptionDiscount {
  id: string;
  code: string;
  name_ar?: string;
  name_en?: string;
  type: 'percentage' | 'fixed' | 'trial_extension';
  value: number;
  applicable_plans?: string[];
  applicable_cycles?: BillingCycle[];
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  current_uses: number;
  max_uses_per_user: number;
  min_amount_egp?: number;
  requires_first_subscription: boolean;
  is_active: boolean;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  referrer_reward_type: 'discount' | 'credit' | 'free_month';
  referrer_reward_value: number;
  referee_reward_type: 'discount' | 'credit' | 'free_month';
  referee_reward_value: number;
  total_referrals: number;
  successful_conversions: number;
  total_earnings_egp: number;
  is_active: boolean;
}

// Helper type for feature checking
export interface FeatureAccess {
  hasAccess: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
}

// Pricing display helpers
export interface PricingDisplay {
  monthly: {
    price: number;
    perDay: number;
    savings?: number;
  };
  yearly: {
    price: number;
    perMonth: number;
    savings: number;
    savingsPercent: number;
  };
}

export function calculatePricingDisplay(plan: SubscriptionPlan): PricingDisplay {
  const monthlyPrice = plan.price_monthly_egp;
  const yearlyPrice = plan.price_yearly_egp;
  const yearlyIfMonthly = monthlyPrice * 12;
  const yearlySavings = yearlyIfMonthly - yearlyPrice;
  
  return {
    monthly: {
      price: monthlyPrice,
      perDay: Math.round((monthlyPrice / 30) * 100) / 100,
    },
    yearly: {
      price: yearlyPrice,
      perMonth: Math.round((yearlyPrice / 12) * 100) / 100,
      savings: yearlySavings,
      savingsPercent: Math.round((yearlySavings / yearlyIfMonthly) * 100),
    },
  };
}

