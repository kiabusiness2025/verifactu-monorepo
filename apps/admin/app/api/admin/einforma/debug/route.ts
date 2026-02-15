import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { searchCompanies } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "expert").trim();

    if (q.length < 3) {
      return NextResponse.json(
        {
          ok: false,
          error: "Query must be at least 3 characters",
          query: q,
        },
        { status: 400 }
      );
    }

    const envCheck = {
      EINFORMA_TOKEN_URL: hasEnv("EINFORMA_TOKEN_URL"),
      EINFORMA_API_BASE_URL: hasEnv("EINFORMA_API_BASE_URL"),
      EINFORMA_BASE_URL: hasEnv("EINFORMA_BASE_URL"),
      EINFORMA_CLIENT_ID: hasEnv("EINFORMA_CLIENT_ID"),
      EINFORMA_CLIENT_SECRET: hasEnv("EINFORMA_CLIENT_SECRET"),
      EINFORMA_SCOPE: hasEnv("EINFORMA_SCOPE"),
      EINFORMA_AUDIENCE_OR_SCOPE: hasEnv("EINFORMA_AUDIENCE_OR_SCOPE"),
    };

    const startedAt = Date.now();
    const items = await searchCompanies(q);
    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      query: q,
      elapsedMs,
      envCheck,
      count: items.length,
      sample: items.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "eInforma debug failed",
        message: getErrorMessage(error),
      },
      { status: 502 }
    );
  }
}

