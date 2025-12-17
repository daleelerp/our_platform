# Path Generation System - Quick Start Guide

## What Was Built

A complete personalized learning path generation system for Oracle ERP that:

1. ✅ Generates customized paths based on user preferences
2. ✅ Includes budget-based content tiers (Free, Basic, Premium)
3. ✅ Creates structured paths with milestones, skills, and projects
4. ✅ Searches for courses from multiple platforms
5. ✅ Supports Arabic and English
6. ✅ Saves paths to database for future use

## Files Created

### Core Services
- `src/services/pathGenerator.ts` - Main path generation logic
- `src/services/courseSearch.ts` - Course search functionality

### API
- `src/app/api/paths/generate/route.ts` - API endpoint for path generation

### UI
- `src/components/PathGenerator.tsx` - User interface component
- `src/app/(main)/generate-path/page.tsx` - Page to access the generator

### Documentation
- `docs/PATH_GENERATION_SYSTEM.md` - Complete system documentation
- `docs/PATH_GENERATION_QUICK_START.md` - This file

## How to Use

### For Users

1. Navigate to `/generate-path` (or add link to navigation)
2. Fill in the form:
   - Experience level (Beginner to Expert)
   - Focus area (Technical, Functional, or Both)
   - Budget tier (Free, Basic, or Premium)
   - Optional: Oracle module, career goals, time commitment
3. Click "Generate Path"
4. Review the generated path with:
   - Milestones with resources
   - Budget breakdown
   - Final project
   - Portfolio recommendations

### For Developers

#### Generate a Path Programmatically

```typescript
import { generatePersonalizedPath } from "@/services/pathGenerator";

const path = await generatePersonalizedPath({
  userPreferences: {
    language: "en",
    experienceLevel: "beginner",
    focusArea: "both",
    budgetTier: "basic",
    estimatedBudget: 1500,
  },
  oracleModule: "Financials",
  careerGoals: ["Oracle Consultant"],
  timeCommitment: 10,
});
```

#### Use the API

```typescript
const response = await fetch("/api/paths/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    language: "en",
    experienceLevel: "intermediate",
    focusArea: "technical",
    budgetTier: "premium",
    estimatedBudget: 5000,
    oracleModule: "SCM",
    timeCommitment: 15,
  }),
});

const data = await response.json();
console.log(data.path);
```

## Budget Tiers Explained

### Free Tier (0 EGP)
- YouTube tutorials
- Oracle Documentation
- Free articles and forums
- Best for: Self-learners with no budget

### Basic Tier (1-2000 EGP)
- Udemy courses (500-1500 EGP)
- SkillShare (400-800 EGP)
- Affordable structured courses
- Best for: Serious learners with limited budget

### Premium Tier (2001-10000 EGP)
- Coursera specializations (2000-5000 EGP)
- Oracle University (5000-10000 EGP)
- Official certifications
- Best for: Professional development

## Integration Points

### Add to Navigation

Add a link to the path generator in your navigation:

```tsx
<Link href="/generate-path">
  {language === "ar" ? "إنشاء مسار مخصص" : "Generate Custom Path"}
</Link>
```

### Add to Dashboard

Show a card for path generation:

```tsx
<Link href="/generate-path">
  <div className="card">
    <h3>Generate Personalized Path</h3>
    <p>Get a custom learning path based on your goals</p>
  </div>
</Link>
```

## Environment Setup

Required:
```env
GROQ_API_KEY=your_groq_api_key_here
```

Optional (for enhanced course search):
```env
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id
```

## Database Schema

The system uses existing tables:
- `learning_paths` - Stores generated paths
- `path_milestones` - Stores milestones
- `learning_resources` - Stores course resources
- `milestone_resources` - Links resources to milestones
- `resource_platforms` - Stores platform information

No new tables needed! The system integrates with existing schema.

## Next Steps

1. **Test the System**
   - Navigate to `/generate-path`
   - Generate a test path
   - Verify it saves to database

2. **Add Navigation Link**
   - Add link to main navigation
   - Or add to dashboard/homepage

3. **Enhance Course Search** (Optional)
   - Integrate Google Custom Search API
   - Add web scraping for course prices
   - Update course data regularly

4. **Add User Features**
   - Save favorite generated paths
   - Share paths with others
   - Track progress through generated paths

## Troubleshooting

### "Failed to generate path"
- Check GROQ_API_KEY is set in `.env.local`
- Verify user is logged in
- Check API response in browser console

### "No courses found"
- Course search uses template data by default
- Enhance with real web search API for live data

### Path not saving
- Check database connection
- Verify user has proper permissions
- Check console for database errors

## Support

For issues or questions:
1. Check `docs/PATH_GENERATION_SYSTEM.md` for detailed docs
2. Review API responses in browser console
3. Check server logs for errors

