# Implementation Summary: Job Roles, Salary Ranges & Plan Management

## Overview
This document summarizes the implementation of two major features:
1. **Job Roles & Salary Ranges System** - Enhanced onboarding with job role selection and salary range validation
2. **Plan-Path Management System** - Admin interface for managing which learning paths are available in which subscription plans

---

## 1. Job Roles & Salary Ranges System

### Database Schema

#### New Table: `salary_ranges`
**File:** `docs/sql/add_salary_ranges_schema.sql`

Stores salary ranges by:
- Job role
- Region (Egypt, Gulf countries: Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman)
- Experience level (beginner, intermediate, senior, expert)
- Market data (demand score, growth trend, remote work percentage)

**Key Fields:**
- `job_role_id` - References job_roles table
- `region` - 'egypt', 'gulf', 'saudi_arabia', 'uae', etc.
- `experience_level` - 'beginner', 'intermediate', 'senior', 'expert'
- `salary_min`, `salary_max` - Salary range
- `salary_currency` - 'EGP', 'SAR', 'AED', 'USD', etc.
- `salary_period` - 'monthly' or 'yearly'
- `market_demand_score` - 0-100 score
- `growth_trend` - 'rising', 'stable', 'declining'

#### Updated Table: `user_profiles`
**New Columns:**
- `preferred_job_role_id` - User's selected job role from onboarding
- `salary_preference_region` - 'egypt', 'gulf', or 'both'
- `salary_expectation_min` - User's minimum salary expectation
- `salary_expectation_max` - User's maximum salary expectation
- `salary_expectation_currency` - Currency for salary expectations

### Components

#### 1. JobRolesExplanation Component
**File:** `src/components/JobRolesExplanation.tsx`

**Features:**
- Displays all active job roles from database
- Allows user to select a target job role
- Shows role details:
  - Description (EN/AR)
  - Category (functional, technical, management, consulting)
  - Daily activities
- Bilingual support (English/Arabic)
- Visual selection with highlighted selected role

**Props:**
- `onSelect(jobRoleId: string)` - Callback when role is selected
- `selectedJobRoleId?: string` - Pre-selected role ID
- `onNext()` - Proceed to next step
- `onSkip?()` - Optional skip functionality

#### 2. SalaryRangesSelection Component
**File:** `src/components/SalaryRangesSelection.tsx`

**Features:**
- Region selection (Egypt, Gulf countries)
- Experience level selection
- Displays market salary data for selected role/region/experience
- Option to use market data or enter custom salary
- Real-time data loading from `salary_ranges` table
- Currency display based on selected region
- Market demand score display

**Supported Regions:**
- Egypt (EGP)
- Gulf Countries (USD)
- Saudi Arabia (SAR)
- UAE (AED)
- Kuwait (KWD)
- Qatar (QAR)

**Props:**
- `jobRoleId: string | null` - Required job role ID
- `onSelect(data)` - Callback with selected salary data
- `onNext()` - Proceed to next step
- `onBack?()` - Optional back button
- `initialData?` - Pre-filled data

### Integration Status

**⚠️ Pending:** Integration into onboarding flow
- Components are created and ready
- Need to add steps to `OnboardingForm` component
- Steps should be added after basic profile information
- Suggested flow:
  1. Basic profile (existing)
  2. Job role selection (new - JobRolesExplanation)
  3. Salary range selection (new - SalaryRangesSelection)
  4. Continue with existing onboarding steps

**To Integrate:**
1. Import components in `OnboardingForm.tsx`
2. Add new steps to the form flow
3. Save job role and salary data to `user_profiles` table
4. Update `handleSubmit` to include new fields

---

## 2. Plan-Path Management System

### Database Schema

#### New Table: `plan_paths`
**File:** `docs/sql/add_salary_ranges_schema.sql`

Junction table linking subscription plans to learning paths.

**Key Fields:**
- `plan_id` - References subscription_plans
- `learning_path_id` - References learning_paths
- `is_featured` - Boolean flag for featured paths in plan
- `sort_order` - Display order within plan

**Unique Constraint:** One path can only be assigned once per plan

### Admin Interface

#### Plan Paths Management Page
**File:** `src/app/admin/plans/[id]/paths/page.tsx`

**Features:**
- View all paths assigned to a specific plan
- View all available paths (not yet assigned)
- Add paths to plan
- Remove paths from plan
- Mark paths as "featured" within plan
- Set display order (sort_order)
- Real-time updates with toast notifications

**UI Sections:**
1. **Assigned Paths** - Shows paths currently in plan
   - Display path title (EN/AR)
   - Published/Draft status
   - Featured badge
   - Featured checkbox toggle
   - Sort order input
   - Remove button

2. **Available Paths** - Shows paths not yet assigned
   - Display path title (EN/AR)
   - Published/Draft status
   - Add to Plan button

**Navigation:**
- Accessible from Plans page via "Manage Paths" button
- Back link to Plans page

#### Updated Plans Page
**File:** `src/app/admin/plans/page.tsx`

**Changes:**
- Added "Manage Paths" button to each plan row
- Links to `/admin/plans/[id]/paths`

### API Updates

#### Admin Data API
**File:** `src/app/api/admin/data/route.ts`

**Enhancements:**
- Added support for `plan_id` query parameter
- Added join support for `plan_paths` table
- Automatically joins `learning_paths` when querying `plan_paths`
- Returns full path details with plan-path relationship data

**Query Examples:**
```
GET /api/admin/data?table=plan_paths&plan_id=<uuid>
// Returns plan_paths with joined learning_paths data
```

---

## Usage Instructions

### For Administrators

#### Managing Plan Paths:
1. Navigate to `/admin/plans`
2. Click "Manage Paths" button for any plan
3. View assigned paths and available paths
4. Add paths by clicking "Add to Plan"
5. Remove paths by clicking "Remove"
6. Toggle "Featured" status for paths
7. Adjust sort order for display

#### Setting Up Salary Ranges:
1. Run the SQL migration: `docs/sql/add_salary_ranges_schema.sql`
2. Populate `salary_ranges` table with market data
3. Link salary ranges to job roles
4. Set region, experience level, and salary data

### For Developers

#### Integrating Job Roles & Salary into Onboarding:

```tsx
// In OnboardingForm.tsx
import { JobRolesExplanation } from "@/components/JobRolesExplanation";
import { SalaryRangesSelection } from "@/components/SalaryRangesSelection";

// Add to form state
const [selectedJobRoleId, setSelectedJobRoleId] = useState<string | null>(null);
const [salaryData, setSalaryData] = useState<{
  region: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
} | null>(null);

// Add steps to form flow
// Step 4: Job Role Selection
// Step 5: Salary Range Selection

// Update handleSubmit to save:
preferred_job_role_id: selectedJobRoleId,
salary_preference_region: salaryData?.region,
salary_expectation_min: salaryData?.salaryMin,
salary_expectation_max: salaryData?.salaryMax,
salary_expectation_currency: salaryData?.currency,
```

---

## Database Migrations Required

1. **Run:** `docs/sql/add_salary_ranges_schema.sql`
   - Creates `salary_ranges` table
   - Updates `user_profiles` table
   - Creates `plan_paths` table
   - Sets up indexes and RLS policies

2. **Populate Data:**
   - Add salary range data to `salary_ranges` table
   - Link to existing `job_roles` records
   - Set up regions and experience levels

---

## Next Steps

1. **Complete Onboarding Integration**
   - Add job role and salary steps to OnboardingForm
   - Test full onboarding flow
   - Ensure data persistence

2. **Data Population**
   - Populate `salary_ranges` table with real market data
   - Ensure all job roles have corresponding salary ranges
   - Add data for all supported regions

3. **UI Enhancements**
   - Add salary range display in user dashboard
   - Show job role recommendations based on selected role
   - Display salary insights in path detail pages

4. **Testing**
   - Test plan-path assignment functionality
   - Verify salary range queries work correctly
   - Test bilingual support
   - Validate data persistence

---

## Files Created/Modified

### New Files:
- `docs/sql/add_salary_ranges_schema.sql`
- `src/components/JobRolesExplanation.tsx`
- `src/components/SalaryRangesSelection.tsx`
- `src/app/admin/plans/[id]/paths/page.tsx`
- `docs/IMPLEMENTATION_SUMMARY.md`

### Modified Files:
- `src/app/admin/plans/page.tsx` - Added "Manage Paths" button
- `src/app/api/admin/data/route.ts` - Added plan_paths join support

---

## Notes

- All components support bilingual (English/Arabic) interface
- Salary ranges support multiple currencies based on region
- Plan-path relationships allow flexible path assignment per plan
- Featured paths can be highlighted within plans
- Sort order allows custom display ordering

