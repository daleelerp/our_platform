# Testing & Setup Guide for Paths & Plans Feature

## 🚀 Quick Start Testing

### 1. **Access the New Paths Page**
```
URL: http://localhost:3000/paths
```

### 2. **Test Anonymous User Flow**
- Open incognito/private browser window
- Visit http://localhost:3000/paths
- You should see:
  - ✅ All paths displayed with difficulty badges
  - ✅ Each path shows available plans below
  - ✅ Plan pricing displayed for each
  - ✅ "Subscribe Now" buttons for each plan
  - ✅ NO "View Path" buttons (no access without subscription)

### 3. **Test Authenticated User Flow**
- Log in with a user account
- Visit http://localhost:3000/paths
- You should see:
  - ✅ Expandable path cards
  - ✅ Plan cards with "Subscribe Now" or "View Path" buttons
  - ✅ "Subscribed" badges on plans user already has
  - ✅ Ability to expand/collapse path details

### 4. **Test Subscription Flow**
- Click "Subscribe Now" on any plan
- You should be redirected to: `/checkout?planId=[PLAN_ID]&pathId=[PATH_ID]`
- Complete the payment flow (test mode)
- After payment, return to `/paths`
- You should see:
  - ✅ Updated subscription status
  - ✅ "View Path" button now active for subscribed plan
  - ✅ Option to subscribe to additional plans

### 5. **Test Path Access After Subscription**
- Click "View Path" on a subscribed plan
- Should load: `/paths/[slug]`
- Should show:
  - ✅ Full path content
  - ✅ Milestones and lessons
  - ✅ NO error redirects

### 6. **Test Access Control**
- Click "View Path" on a path from a plan you DON'T have
- You should be:
  - ✅ Redirected back to `/paths?error=path_not_in_plan`
  - ✅ Shown error message about subscription required
  - ✅ NOT able to access path content

---

## 🎨 Understanding the Component Structure

### AllPathsWithPlans Component
```
┌─────────────────────────────────────────────┐
│  Paths & Plans Page                         │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Path Card (Expandable)              │   │
│  ├─────────────────────────────────────┤   │
│  │ Title: Oracle Financials Foundation │   │
│  │ Duration: 20h | Level: Beginner     │   │
│  │ ▼ (Click to expand)                 │   │
│  ├─────────────────────────────────────┤   │
│  │ [When Expanded]                     │   │
│  │ Target Roles: Finance Manager...    │   │
│  │                                     │   │
│  │ Available Plans:                    │   │
│  │ ┌─────────┐ ┌──────────┐ ┌────────┐ │   │
│  │ │ Explorer│ │Professional│Enterprise│   │
│  │ │ Free    │ │ 299 EGP   │Custom  │   │
│  │ │[Subscribe] │[Subscribe]│[Contact] │   │
│  │ └─────────┘ └──────────┘ └────────┘ │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [More Path Cards...]                       │
│                                             │
└─────────────────────────────────────────────┘
```

### Plan Card States

#### Not Subscribed (Anonymous)
```
┌─────────────────────┐
│ Professional        │
│ 299 EGP            │
│ Monthly            │
│                    │
│ [Subscribe Now]    │
└─────────────────────┘
```

#### Not Subscribed (Logged In)
```
┌─────────────────────┐
│ Professional        │
│ 299 EGP            │
│ Monthly            │
│                    │
│ [Subscribe Now]    │  ← Opens /checkout
└─────────────────────┘
```

#### Already Subscribed
```
┌─────────────────────┐
│ Professional ✓      │
│ [Subscribed Badge]  │
│ 299 EGP            │
│                    │
│ [View Path]        │  ← Opens path directly
└─────────────────────┘
```

---

## 🗄️ Database Setup Requirements

### Required Tables (Should Already Exist):
- ✅ `learning_paths` - Path definitions
- ✅ `subscription_plans` - Plan definitions  
- ✅ `plan_paths` - Path-to-Plan associations
- ✅ `user_subscriptions` - User's subscriptions

### Verify Setup:
```sql
-- Check if paths have associated plans
SELECT 
    lp.id,
    lp.title,
    COUNT(pp.id) as plan_count,
    STRING_AGG(sp.display_name_en, ', ') as plans
FROM learning_paths lp
LEFT JOIN plan_paths pp ON lp.id = pp.learning_path_id
LEFT JOIN subscription_plans sp ON pp.plan_id = sp.id
WHERE lp.is_published = true
GROUP BY lp.id, lp.title
ORDER BY lp.title;
```

### Add Paths to Plans (if needed):
```sql
-- Example: Add an existing path to Premium plan
INSERT INTO plan_paths (plan_id, learning_path_id)
SELECT 
    sp.id as plan_id,
    lp.id as learning_path_id
FROM subscription_plans sp, learning_paths lp
WHERE sp.name = 'premium'
  AND lp.slug = 'oracle-financials-foundation-business'
ON CONFLICT (plan_id, learning_path_id) DO NOTHING;
```

---

## 📊 Testing Different Scenarios

### Scenario 1: New User Journey
```
1. Visit /paths (anonymous)
2. Browse all available paths and plans
3. Click "Subscribe Now" on Professional plan
4. Redirected to /checkout?planId=XXX
5. Complete payment
6. See "Subscribed" badge on Professional plan
7. Click "View Path" on a Professional path
8. Access path content
```

### Scenario 2: Multi-Plan User
```
1. User has both 'free' and 'premium' subscriptions
2. Visit /paths (authenticated)
3. See different buttons for different plans:
   - Enterprise paths: "Subscribe Now" (inactive)
   - Premium paths: "View Path" (active) + "Subscribed" badge
   - Free paths: "View Path" (active) + "Subscribed" badge
4. Can subscribe to additional plans
```

### Scenario 3: Unauthorized Access
```
1. User tries to directly visit /paths/[slug] for path not in their plan
2. Server-side check fails (isPathInUserPlan = false)
3. Redirected to /paths?error=path_not_in_plan
4. Error message shown
```

---

## 🔧 Customization Guide

### Change Plan Names (Proof of Concept)
```sql
UPDATE subscription_plans 
SET 
    display_name_en = 'Your New Name',
    display_name_ar = 'الاسم الجديد'
WHERE name = 'premium';
```

### Add New Plans
```sql
INSERT INTO subscription_plans (
    name, display_name_en, display_name_ar,
    price_monthly_egp, price_yearly_egp,
    description_en, description_ar,
    is_active, sort_order
) VALUES (
    'starter_bundle', 
    'Starter Bundle',
    'حزمة البداية',
    299, 2999,
    'Perfect for beginners',
    'مثالي للمبتدئين',
    true,
    4
);
```

### Associate Paths with Plans
```sql
INSERT INTO plan_paths (plan_id, learning_path_id, is_featured)
SELECT 
    sp.id as plan_id,
    lp.id as learning_path_id,
    true as is_featured
FROM subscription_plans sp
CROSS JOIN learning_paths lp
WHERE sp.name = 'premium'
  AND lp.is_published = true
ON CONFLICT (plan_id, learning_path_id) DO NOTHING;
```

---

## 🐛 Troubleshooting

### Issue: No paths showing
- Check: Are paths published? (`is_published = true`)
- Check: Are paths associated with plans? (Check `plan_paths` table)
- Check: Does the user have a subscription? (Check `user_subscriptions` table)

### Issue: "Subscribe Now" redirects to wrong place
- Check: `checkout` page exists and accepts `planId` parameter
- Check: URL params are passing correctly: `/checkout?planId={plan_id}`

### Issue: "View Path" button doesn't work
- Check: User is subscribed to the plan (`user_subscriptions` active)
- Check: Path is associated with the plan (`plan_paths` exists)
- Check: User has access validation passing (`isPathInUserPlan` = true)

### Issue: Plan names not showing correctly
- Check: `display_name_en` and `display_name_ar` are set
- Check: Fallback to `name` if display names are null
- Clear browser cache (F12 > Storage > Clear Site Data)

---

## 📱 Mobile Testing

The component is fully responsive:
- ✅ Desktop: 3-column grid for plans
- ✅ Tablet: 2-column grid for plans  
- ✅ Mobile: 1-column, full-width cards

Test on different screen sizes:
- 375px (iPhone SE)
- 768px (iPad)
- 1024px (iPad Pro)
- 1440px (Desktop)

---

## 🎯 Key URLs to Test

| URL | Expected Behavior |
|-----|-------------------|
| `/paths` | Shows all paths with plan selection |
| `/paths?error=path_not_in_plan` | Shows error about subscription |
| `/paths/[slug]` | Shows path (with access check) |
| `/checkout?planId=XXX` | Shows checkout for selected plan |
| `/dashboard` | Shows user's subscriptions |

---

## ✅ Pre-Launch Checklist

- [ ] All paths are marked as published
- [ ] Plans are associated with paths in `plan_paths` table
- [ ] Plan names are set (both English and Arabic)
- [ ] Pricing is correct for all plans
- [ ] Checkout page is fully functional
- [ ] Payment provider (Paymob) is configured
- [ ] Subscription webhooks are working
- [ ] User subscription status updates after payment
- [ ] Error messages display correctly
- [ ] Mobile responsive design verified
- [ ] Multi-language support tested (Arabic/English)
- [ ] Multiple subscriptions tested (user with 2+ plans)

