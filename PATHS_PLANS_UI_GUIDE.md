# Visual Guide: Paths & Plans UI Walkthrough

## 📱 Anonymous User View

```
╔════════════════════════════════════════════════════════════════╗
║ 🌐 Browser: http://localhost:3000/paths                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  All Paths & Plans                                            ║
║  Explore all learning paths and choose the plan that fits you ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Oracle Financials Foundation                          │   ║
║  │ "Master financial management in Oracle ERP systems"   │   ║
║  │ ⭐ Beginner | 20 hours                               │   ║
║  │                                                        │   ║
║  │ Target Roles: Finance Manager, Accountant            │   ║
║  │                                                        │   ║
║  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │   ║
║  │ │ Explorer     │ │Professional  │ │ Enterprise   │   │   ║
║  │ │ Free         │ │ 299 EGP      │ │ Contact us   │   │   ║
║  │ │ Monthly      │ │ Monthly      │ │ Per user     │   │   ║
║  │ │              │ │              │ │              │   │   ║
║  │ │[Subscribe Now]│[Subscribe Now]│[Subscribe Now]│   │   ║
║  │ └──────────────┘ └──────────────┘ └──────────────┘   │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  [More paths below...]                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

## 👤 Authenticated User View

```
╔════════════════════════════════════════════════════════════════╗
║ 🌐 Browser: http://localhost:3000/paths (Logged In)           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  All Paths & Plans                                            ║
║  Explore all learning paths and choose the plan that fits you ║
║                                                                ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Oracle Financials Foundation                   ▼ Click│   ║
║  │ Master financial management in Oracle ERP systems     │   ║
║  │ ⭐ Beginner | 20 hours                               │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  [Path Expanded - Shows details]                              ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Oracle Financials Foundation                   ^ Close │   ║
║  │ Master financial management in Oracle ERP systems     │   ║
║  │ ⭐ Beginner | 20 hours                               │   ║
║  │                                                        │   ║
║  │ Target Roles:                                        │   ║
║  │ [Finance Manager] [Accountant] [+2 more]            │   ║
║  │                                                        │   ║
║  │ Available Plans:                                      │   ║
║  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │   ║
║  │ │ Explorer     │ │Professional  │ │ Enterprise   │   │   ║
║  │ │ ✓ Subscribed │ │ 299 EGP      │ │ Contact us   │   │   ║
║  │ │ Free         │ │ Monthly      │ │ Per user     │   │   ║
║  │ │              │ │              │ │              │   │   ║
║  │ │[View Path]   │ │[Subscribe Now]│[Subscribe Now]│   │   ║
║  │ └──────────────┘ └──────────────┘ └──────────────┘   │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  [More collapsed paths below...]                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

## 💳 Subscription Flow

```
USER JOURNEY:

┌─────────────────┐
│ Visits /paths   │
└────────┬────────┘
         │
         ├─── Anonymous User
         │    ↓
         │    Browse all paths & plans
         │    ↓
         │    Click "Subscribe Now"
         │    ↓
         │    /checkout?planId=XXX
         │    ↓
         │    Complete Payment
         │    ↓
         │    user_subscriptions table updated
         │    ↓
         │    Return to /paths (now authenticated)
         │    ↓
         │    "View Path" buttons now active
         │
         └─── Authenticated User
              ↓
              See subscription status
              ↓
              Subscribed plans → "View Path"
              ↓
              Not subscribed → "Subscribe Now"
              ↓
              Can subscribe to additional plans
```

## 🔄 Multi-Plan Subscription

```
User can have multiple active plans simultaneously:

┌─────────────────────────────────────┐
│ User Subscriptions                  │
├─────────────────────────────────────┤
│ Plan: Explorer (Free)           ✓   │
│ Status: Active | Paths: 2           │
│                                     │
│ Plan: Professional (299 EGP)    ✓   │
│ Status: Active | Paths: 45          │
│                                     │
│ Plan: Enterprise                    │
│ Status: Not Subscribed              │
│ [Subscribe to Enterprise]            │
└─────────────────────────────────────┘

Access granted to all paths in ALL subscribed plans.
Total paths accessible: 2 + 45 = 47 paths
```

## 🛡️ Access Control

```
Scenario 1: User tries to access unauthorized path

┌──────────────────────────────────────┐
│ User visits: /paths/oracle-hr-master │
│ (Not in their subscribed plans)      │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ Server validates: isPathInUserPlan   │
│ Result: false (not in any plan)      │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│ Redirect to: /paths?error=...        │
│ Show error: "This path is not       │
│ available in your current plan"      │
└──────────────────────────────────────┘
```

## 📊 State Management

```
Component: AllPathsWithPlans
│
├─ State: expandedPath (string | null)
│  └─ Tracks which path card is expanded
│     Allows only one expanded at a time
│
├─ Props: isLoggedIn (boolean)
│  └─ Controls UI elements shown
│     Different buttons for auth vs anonymous
│
├─ Props: userSubscribedPlans (string[] | null)
│  └─ Array of plan IDs user is subscribed to
│     Used to show subscription badges
│
└─ Props: pathsWithPlans (PathWithPlans[])
   └─ Denormalized data structure
      Each row = path + one plan combination
      Grouped by path ID for display
```

## 🎯 Key UI States

### Plan Card - Not Subscribed
```
┌─────────────────────┐
│ Professional        │ ← Plan name
│ 299 EGP            │ ← Price
│ Monthly            │ ← Billing cycle
│                    │
│ [Subscribe Now]    │ ← Action button
└─────────────────────┘
```

### Plan Card - Already Subscribed
```
┌─────────────────────┐
│ Professional        │
│ ✓ [Subscribed]     │ ← Badge showing subscription
│ 299 EGP            │
│                    │
│ [View Path]        │ ← Different action
└─────────────────────┘
```

### Plan Card - Loading State
```
┌─────────────────────┐
│ ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌ │ ← Skeleton loading
│ ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌ │
│ ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌ │
└─────────────────────┘
```

## 🌍 Multi-Language Support

```
English Mode:
┌─────────────────────┐
│ Professional        │
│ 299 EGP            │
│ Monthly            │
│ [Subscribe Now]    │
└─────────────────────┘

Arabic Mode (RTL):
┌─────────────────────┐
│       احترافي        │
│ 299 جنيه مصري      │
│      شهري           │
│ [اشترك الآن]       │
└─────────────────────┘
```

## 📱 Responsive Breakpoints

```
Mobile (< 768px):
┌─────────────────────────┐
│ Path Card (1 column)    │
│                         │
│ [Plan 1]               │
│ [Plan 2]               │
│ [Plan 3]               │
└─────────────────────────┘

Tablet (768px - 1024px):
┌──────────────────────────────────┐
│ Path Card (2 columns)            │
│                                  │
│ [Plan 1]        [Plan 2]        │
│                 [Plan 3]        │
└──────────────────────────────────┘

Desktop (> 1024px):
┌────────────────────────────────────────────┐
│ Path Card (3 columns)                      │
│                                            │
│ [Plan 1]    [Plan 2]    [Plan 3]         │
└────────────────────────────────────────────┘
```

## 🔗 URL Navigation

```
Entry Points:
├─ /paths                     → Show all paths with plans
├─ /paths?error=...          → Error message display
└─ /paths/[slug]             → Individual path (with access check)

Checkout Flow:
├─ /checkout?planId=XXX      → Show checkout page
├─ /checkout?planId=XXX&pathId=YYY → Checkout with path context
└─ /checkout [After payment] → Success/retry flow

User Dashboard:
├─ /dashboard                 → View all subscriptions
├─ /profile                   → Manage account
└─ /profile/subscriptions    → Manage plans
```

## 💡 Copy & Messaging

```
Anonymous User Prompt:
┌─────────────────────────────────────────┐
│ 🔐 Sign in to Subscribe to Paths       │
│                                         │
│ Create an account to subscribe to       │
│ learning paths and start learning.     │
└─────────────────────────────────────────┘

Error Message:
┌─────────────────────────────────────────┐
│ ⚠️  Path Not Available                  │
│                                         │
│ This path is not available in your     │
│ current subscription plan. Please      │
│ upgrade to access this path.           │
└─────────────────────────────────────────┘

Success Badge:
┌──────────────────┐
│ ✅ Subscribed    │
│                  │
│ You have access  │
│ to this plan     │
└──────────────────┘
```

---

This visual guide shows the complete user experience flow. Test each scenario to ensure the UI matches these layouts.
