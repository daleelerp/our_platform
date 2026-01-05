import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/utils/admin-auth";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
    try {
        const adminSession = await getAdminSession();
        if (!adminSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const url = searchParams.get("url");

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const metadata = {
            title: $("title").text() || $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content"),
            description: $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || $('meta[name="twitter:description"]').attr("content"),
            image: $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content"),
        };

        return NextResponse.json(metadata);
    } catch (error: any) {
        console.error("Link preview API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
