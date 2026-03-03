import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";

// Proxy placeholder for NetSuite supply master items
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    // TODO: Implement NetSuite SuiteQL or REST API integration
    // This is a proxy placeholder that will forward requests to NetSuite
    return NextResponse.json({
      items: [],
      total: 0,
      limit,
      offset,
      message: "NetSuite supply master integration pending",
    });
  } catch (error) {
    console.error("Failed to fetch supply master items:", error);
    return NextResponse.json(
      { error: "Failed to fetch supply master items" },
      { status: 500 }
    );
  }
}
