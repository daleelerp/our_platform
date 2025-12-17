# Personalized Learning Path Generation System

## Overview

This system generates personalized Oracle ERP learning paths based on user preferences, experience level, budget, and career goals. Each path includes milestones, difficulty levels, skills gained, and practical projects with budget-based content tiers.

## Features

✅ **Personalized Path Generation**
- AI-powered path creation using Groq API
- Customized based on experience level, focus area, and goals
- Bilingual support (Arabic/English)

✅ **Budget-Based Content Tiers**
- **Free Tier**: YouTube videos, Oracle Documentation, free tutorials
- **Basic Tier (1-2000 EGP)**: Udemy, SkillShare courses
- **Premium Tier (2001-10000 EGP)**: Coursera, Oracle University, official training

✅ **Comprehensive Path Structure**
- Multiple milestones with clear learning objectives
- Skills gained at each milestone
- Practical checkpoints (quizzes, projects, certifications)
- Final practical project
- Portfolio recommendations

✅ **Course Integration**
- Automatic course search based on budget tier
- Real-time course data from multiple platforms
- Price tracking in EGP

## Architecture

### Components

1. **Path Generator Service** (`src/services/pathGenerator.ts`)
   - Core logic for generating personalized paths
   - AI integration with Groq API
   - Template-based fallback

2. **Course Search Service** (`src/services/courseSearch.ts`)
   - Searches for courses based on budget tier
   - Integrates with multiple platforms
   - Returns structured course data

3. **API Endpoint** (`src/app/api/paths/generate/route.ts`)
   - Handles path generation requests
   - Saves generated paths to database
   - Returns structured JSON response

4. **UI Component** (`src/components/PathGenerator.tsx`)
   - User-friendly interface for path generation
   - Form for user preferences
   - Display of generated paths

### Database Integration

Generated paths are saved to:
- `learning_paths` table
- `path_milestones` table
- `learning_resources` table
- `milestone_resources` table (links resources to milestones)

## Usage

### API Endpoint

```typescript
POST /api/paths/generate

Request Body:
{
  language: "en" | "ar",
  experienceLevel: "beginner" | "intermediate" | "advanced" | "expert",
  focusArea: "technical" | "functional" | "both",
  budgetTier: "free" | "basic" | "premium",
  estimatedBudget?: number, // in EGP (required if not free)
  oracleModule?: string, // e.g., "Financials", "SCM", "HCM"
  careerGoals?: string[], // array of goals
  timeCommitment?: number // hours per week
}

Response:
{
  success: true,
  path: GeneratedPath,
  savedPathId: string
}
```

### UI Component

```tsx
import { PathGenerator } from "@/components/PathGenerator";

<PathGenerator />
```

## Path Structure

Each generated path includes:

### Path Metadata
- Title (English & Arabic)
- Description
- Difficulty level
- Estimated duration
- Target audience
- Prerequisites
- Learning outcomes
- Career outcomes
- Budget breakdown

### Milestones
Each milestone contains:
- Title & description (bilingual)
- Estimated hours
- Difficulty level
- Learning objectives
- Skills gained
- Resources (with budget tier filtering)
- Checkpoint (quiz/project/certification)

### Final Project
- Comprehensive practical project
- Deliverables list
- Portfolio recommendations

## Budget Tiers

### Free Tier (0 EGP)
- YouTube tutorials
- Oracle Documentation
- Free articles and forums
- Community resources

### Basic Tier (1-2000 EGP)
- Udemy courses (typically 500-1500 EGP)
- SkillShare courses (typically 400-800 EGP)
- Affordable online courses

### Premium Tier (2001-10000 EGP)
- Coursera specializations (2000-5000 EGP)
- Oracle University courses (5000-10000 EGP)
- LinkedIn Learning (2000-4000 EGP)
- Official certification programs

## Course Search

The system searches for courses based on:
- Query/topic
- Budget tier
- Language preference
- Maximum results needed

Currently uses template-based course data. Can be enhanced with:
- Google Custom Search API
- SerpAPI
- Web scraping (with proper permissions)
- Direct platform APIs

## AI Integration

Uses Groq API (Llama 3.3 70B) for:
- Path structure generation
- Milestone creation
- Resource recommendations
- Learning objective generation

**Fallback**: Template-based generation if API is unavailable

## Environment Variables

Required:
```env
GROQ_API_KEY=your_groq_api_key
```

Optional (for enhanced course search):
```env
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id
SERPAPI_KEY=your_serpapi_key
```

## Future Enhancements

1. **Real-time Course Search**
   - Integrate with web search APIs
   - Scrape course platforms (with permissions)
   - Update course prices dynamically

2. **User Progress Tracking**
   - Track progress through generated paths
   - Adjust recommendations based on progress
   - Suggest path modifications

3. **Community Features**
   - Share generated paths
   - Rate and review paths
   - Collaborative learning

4. **Advanced Personalization**
   - Learning style detection
   - Adaptive difficulty
   - Personalized resource recommendations

## Example Generated Path

```json
{
  "path": {
    "title": "Oracle Financials for Beginners",
    "title_ar": "أوراكل المالية للمبتدئين",
    "difficulty_level": "beginner",
    "estimated_duration_hours": 40,
    "budget_breakdown": {
      "free": 0,
      "basic": 1200,
      "premium": 0,
      "total": 1200
    }
  },
  "milestones": [
    {
      "milestone_number": 1,
      "title": "Introduction to Oracle Financials",
      "estimated_hours": 8,
      "resources": [
        {
          "title": "Oracle Financials Documentation",
          "platform": "Oracle Documentation",
          "is_free": true,
          "price_egp": 0
        }
      ]
    }
  ],
  "finalProject": {
    "title": "Implement GL Module for Sample Company",
    "deliverables": ["Chart of Accounts", "Journal Entries", "Financial Reports"]
  }
}
```

## Testing

To test the system:

1. Navigate to `/generate-path`
2. Fill in the form:
   - Select experience level
   - Choose focus area
   - Select budget tier
   - Add optional details
3. Click "Generate Path"
4. Review the generated path
5. Path is automatically saved to database (as draft)

## Notes

- Generated paths start as drafts (`is_published: false`)
- Admin can review and publish paths
- Users can generate multiple paths
- Paths are personalized and can be regenerated with different parameters

