import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// YouTube Data API (free tier: 10,000 units/day)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("*, admin_roles(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { job_type, search_query, target_url } = await request.json();

    // Create scrape job record
    const { data: job, error: jobError } = await supabase
      .from("scrape_jobs")
      .insert({
        job_type,
        search_query,
        target_url,
        status: "running",
        created_by: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error("Job creation error:", jobError);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Run scraper based on type
    let results: any[] = [];
    let error: string | null = null;

    try {
      switch (job_type) {
        case "youtube":
          results = await scrapeYouTube(search_query);
          break;
        case "udemy":
          results = await scrapeUdemyPublic(search_query);
          break;
        case "oracle_docs":
          results = await scrapeOracleDocs(search_query);
          break;
        case "job_postings":
          results = await scrapeJobPostings(search_query);
          break;
        default:
          error = "Unknown job type";
      }
    } catch (e: any) {
      error = e.message;
    }

    // Save results to staging
    if (results.length > 0) {
      const stagingData = results.map((r) => ({
        scrape_job_id: job.id,
        title: r.title,
        description: r.description,
        url: r.url,
        resource_type: r.type || "video",
        platform: r.platform,
        language: r.language || "en",
        author_name: r.author,
        publish_date: r.publishDate,
        view_count: r.viewCount,
        rating: r.rating,
        duration_minutes: r.duration,
        thumbnail_url: r.thumbnail,
        review_status: "pending",
      }));

      // Insert with conflict handling (ignore duplicates)
      for (const item of stagingData) {
        await supabase
          .from("scraped_resources_staging")
          .upsert(item, { onConflict: "url", ignoreDuplicates: true });
      }
    }

    // Update job status
    await supabase
      .from("scrape_jobs")
      .update({
        status: error ? "failed" : "completed",
        results_count: results.length,
        error_message: error,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({
      success: !error,
      job_id: job.id,
      results_count: results.length,
      error,
    });

  } catch (error: any) {
    console.error("Scrape API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// YouTube scraper using YouTube Data API
async function scrapeYouTube(query: string): Promise<any[]> {
  if (!YOUTUBE_API_KEY) {
    // Return mock data if no API key
    return getMockYouTubeResults(query);
  }

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " Oracle Cloud ERP tutorial")}&type=video&maxResults=20&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error("YouTube API error");
  }

  const data = await response.json();
  
  // Get video details for duration and stats
  const videoIds = data.items.map((item: any) => item.id.videoId).join(",");
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
  
  const detailsResponse = await fetch(detailsUrl);
  const detailsData = await detailsResponse.json();
  
  const detailsMap = new Map<string, any>(
    detailsData.items.map((item: any) => [item.id as string, item])
  );

  return data.items.map((item: any) => {
    const details: any | undefined = detailsMap.get(item.id.videoId);
    return {
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      type: "video",
      platform: "YouTube",
      author: item.snippet.channelTitle,
      publishDate: item.snippet.publishedAt?.split("T")[0],
      viewCount: details?.statistics?.viewCount ? parseInt(details.statistics.viewCount) : null,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      duration: details?.contentDetails?.duration ? parseDuration(details.contentDetails.duration) : null,
    };
  });
}

// Parse ISO 8601 duration to minutes
function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  return hours * 60 + minutes + Math.round(seconds / 60);
}

// Mock YouTube results for testing without API key
function getMockYouTubeResults(query: string): any[] {
  return [
    {
      title: `Oracle Cloud Financials Complete Tutorial - ${query}`,
      description: "Learn Oracle Cloud Financials from scratch. This comprehensive tutorial covers GL, AP, AR, and more.",
      url: "https://www.youtube.com/watch?v=example1",
      type: "video",
      platform: "YouTube",
      author: "Oracle Learning",
      viewCount: 125000,
      thumbnail: "https://i.ytimg.com/vi/example1/mqdefault.jpg",
      duration: 180,
    },
    {
      title: `${query} - Step by Step Guide`,
      description: "Detailed walkthrough for beginners getting started with Oracle Cloud ERP.",
      url: "https://www.youtube.com/watch?v=example2",
      type: "video",
      platform: "YouTube",
      author: "ERP Academy",
      viewCount: 85000,
      thumbnail: "https://i.ytimg.com/vi/example2/mqdefault.jpg",
      duration: 120,
    },
  ];
}

// Udemy public data scraper (limited without API)
async function scrapeUdemyPublic(query: string): Promise<any[]> {
  // Note: Udemy doesn't have a public API, so we return mock data
  // In production, you'd use their affiliate API or web scraping
  return [
    {
      title: `Oracle Cloud ERP Bootcamp: ${query}`,
      description: "Complete Oracle Cloud ERP course covering all modules with hands-on labs.",
      url: `https://www.udemy.com/course/oracle-erp-${query.toLowerCase().replace(/\s+/g, "-")}/`,
      type: "course",
      platform: "Udemy",
      author: "ERP Expert",
      rating: 4.6,
      duration: 1200,
    },
  ];
}

// Oracle docs scraper
async function scrapeOracleDocs(query: string): Promise<any[]> {
  // Return structured Oracle documentation links
  return [
    {
      title: `Oracle Cloud Financials Documentation - ${query}`,
      description: "Official Oracle documentation for Cloud Financials implementation and configuration.",
      url: `https://docs.oracle.com/en/cloud/saas/financials/`,
      type: "documentation",
      platform: "Oracle Docs",
      author: "Oracle",
    },
    {
      title: "Oracle Cloud Implementation Best Practices",
      description: "Best practices guide for implementing Oracle Cloud applications.",
      url: "https://docs.oracle.com/en/cloud/saas/implementation/",
      type: "documentation",
      platform: "Oracle Docs",
      author: "Oracle",
    },
  ];
}

// Job postings scraper (mock data - would need actual job board API)
async function scrapeJobPostings(query: string): Promise<any[]> {
  // This would integrate with LinkedIn, Indeed, or other job APIs
  return [
    {
      title: `Oracle ${query} Consultant - Job Market Analysis`,
      description: "Analysis of current job postings for Oracle consultants in the MENA region.",
      url: "#",
      type: "job_analysis",
      platform: "Job Analysis",
    },
  ];
}

