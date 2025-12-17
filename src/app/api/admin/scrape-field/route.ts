import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";

/**
 * Scrape field values from the internet
 * Used for auto-filling fields like market_demand_score, salary ranges, etc.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { field_key, search_query, scraper_type } = await request.json();

    if (!field_key || !search_query) {
      return NextResponse.json(
        { error: "field_key and search_query are required" },
        { status: 400 }
      );
    }

    let value: any = null;

    switch (scraper_type) {
      case "demand_score":
        value = await scrapeDemandScore(search_query);
        break;
      case "salary":
        value = await scrapeSalaryRange(search_query);
        break;
      case "demand_level":
        value = await scrapeDemandLevel(search_query);
        break;
      case "job_count":
        value = await scrapeJobCount(search_query);
        break;
      default:
        return NextResponse.json({ error: "Unknown scraper type" }, { status: 400 });
    }

    if (value === null) {
      return NextResponse.json(
        { error: "No data found. Try a different search query." },
        { status: 404 }
      );
    }

    return NextResponse.json({ value, field_key, scraper_type });
  } catch (error: any) {
    console.error("Scrape field API error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Scrape market demand score based on job postings
 * Returns a score from 0.0 to 9.9 based on:
 * - Number of job postings mentioning the skill
 * - Frequency of mentions
 * - Salary ranges (higher salary = higher demand)
 */
async function scrapeDemandScore(searchQuery: string): Promise<number | null> {
  try {
    // This would integrate with job board APIs (LinkedIn, Indeed, etc.)
    // For now, we'll use a mock implementation that can be replaced with real APIs
    
    // Example: Search for job postings with the skill name
    // The score is calculated based on:
    // - Number of postings (0-1000+ postings)
    // - Average salary (higher = more demand)
    // - Growth trend (increasing = higher demand)
    
    // Mock implementation - replace with actual API calls
    const mockScore = calculateMockDemandScore(searchQuery);
    
    return mockScore;
  } catch (error) {
    console.error("Error scraping demand score:", error);
    return null;
  }
}

/**
 * Calculate a mock demand score based on search query
 * In production, this would call real job board APIs
 */
function calculateMockDemandScore(query: string): number {
  // Normalize query
  const normalized = query.toLowerCase();
  
  // High demand skills (Oracle, SAP, Cloud, Financials)
  const highDemandKeywords = ["oracle", "sap", "cloud", "financials", "erp", "consultant"];
  const hasHighDemand = highDemandKeywords.some(keyword => normalized.includes(keyword));
  
  if (hasHighDemand) {
    // Return a score between 7.0 and 9.5
    return Math.round((7.0 + Math.random() * 2.5) * 10) / 10;
  }
  
  // Medium demand skills
  const mediumDemandKeywords = ["analyst", "developer", "manager", "specialist"];
  const hasMediumDemand = mediumDemandKeywords.some(keyword => normalized.includes(keyword));
  
  if (hasMediumDemand) {
    // Return a score between 4.0 and 7.0
    return Math.round((4.0 + Math.random() * 3.0) * 10) / 10;
  }
  
  // Lower demand or niche skills
  // Return a score between 2.0 and 4.0
  return Math.round((2.0 + Math.random() * 2.0) * 10) / 10;
}

/**
 * Scrape salary range for ERP systems/roles in Egypt
 * Returns a formatted string with salary ranges for different experience levels in EGP per month
 * Format: "Beginner: 8,000-12,000 EGP | Intermediate: 12,000-20,000 EGP | Senior: 20,000-35,000 EGP | Expert: 35,000-60,000 EGP (per month)"
 */
async function scrapeSalaryRange(searchQuery: string): Promise<string | null> {
  try {
    // This would integrate with job board APIs (LinkedIn, Indeed, Bayt, Wuzzuf, etc.)
    // For now, we'll use a mock implementation that can be replaced with real APIs
    
    // Normalize query
    const normalized = searchQuery.toLowerCase();
    
    // Determine base salary multipliers based on ERP system type
    let baseMultiplier = 1.0;
    
    // Premium ERP systems (Oracle, SAP) - higher salaries
    const premiumKeywords = ["oracle", "sap", "cloud erp", "financials cloud"];
    const isPremium = premiumKeywords.some(keyword => normalized.includes(keyword));
    if (isPremium) {
      baseMultiplier = 1.4; // 40% premium for Oracle/SAP
    }
    
    // High-demand ERP systems
    const highDemandKeywords = ["microsoft dynamics", "netsuite", "workday"];
    const isHighDemand = highDemandKeywords.some(keyword => normalized.includes(keyword));
    if (isHighDemand) {
      baseMultiplier = 1.2; // 20% premium
    }
    
    // Calculate salary ranges for each experience level in EGP per month
    const salaryRanges = {
      beginner: {
        min: Math.floor(8000 * baseMultiplier),
        max: Math.floor(12000 * baseMultiplier),
      },
      intermediate: {
        min: Math.floor(12000 * baseMultiplier),
        max: Math.floor(20000 * baseMultiplier),
      },
      senior: {
        min: Math.floor(20000 * baseMultiplier),
        max: Math.floor(35000 * baseMultiplier),
      },
      expert: {
        min: Math.floor(35000 * baseMultiplier),
        max: Math.floor(60000 * baseMultiplier),
      },
    };
    
    // Format the salary ranges string with clear, readable labels
    const formatRange = (min: number, max: number) => {
      return `${Math.floor(min).toLocaleString()}-${Math.floor(max).toLocaleString()}`;
    };
    
    // Clear, readable format with experience level labels
    // Format: "Beginner: 8,000-12,000 EGP | Intermediate: 12,000-20,000 EGP | Senior: 20,000-35,000 EGP | Expert: 35,000-60,000 EGP (per month)"
    const salaryString = 
      `Beginner: ${formatRange(salaryRanges.beginner.min, salaryRanges.beginner.max)} EGP | ` +
      `Intermediate: ${formatRange(salaryRanges.intermediate.min, salaryRanges.intermediate.max)} EGP | ` +
      `Senior: ${formatRange(salaryRanges.senior.min, salaryRanges.senior.max)} EGP | ` +
      `Expert: ${formatRange(salaryRanges.expert.min, salaryRanges.expert.max)} EGP (per month)`;
    
    return salaryString;
  } catch (error) {
    console.error("Error scraping salary range:", error);
    return null;
  }
}

/**
 * Scrape demand level for ERP systems
 * Returns one of: "very_high", "high", "medium", "low"
 */
async function scrapeDemandLevel(searchQuery: string): Promise<string | null> {
  try {
    // This would integrate with job board APIs to count job postings
    // For now, we'll use a mock implementation based on keywords
    
    const normalized = searchQuery.toLowerCase();
    
    // Very high demand: Oracle, SAP, Cloud ERP
    const veryHighKeywords = ["oracle", "sap", "cloud erp", "financials consultant"];
    const hasVeryHigh = veryHighKeywords.some(keyword => normalized.includes(keyword));
    if (hasVeryHigh) {
      return "very_high";
    }
    
    // High demand: ERP consultant, financial analyst, ERP developer
    const highKeywords = ["erp consultant", "financial analyst", "erp developer", "financial consultant"];
    const hasHigh = highKeywords.some(keyword => normalized.includes(keyword));
    if (hasHigh) {
      return "high";
    }
    
    // Medium demand: analyst, specialist, coordinator
    const mediumKeywords = ["analyst", "specialist", "coordinator", "administrator"];
    const hasMedium = mediumKeywords.some(keyword => normalized.includes(keyword));
    if (hasMedium) {
      return "medium";
    }
    
    // Lower demand or niche roles
    return "low";
  } catch (error) {
    console.error("Error scraping demand level:", error);
    return null;
  }
}

/**
 * Scrape job count (for future use)
 */
async function scrapeJobCount(searchQuery: string): Promise<number | null> {
  // TODO: Implement job count scraping
  return null;
}

