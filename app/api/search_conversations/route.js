import { NextResponse } from "next/server";
import { readData } from "@/lib/data";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    const data = readData("conversas.json");
    let conversas = data.conversas;

    if (query) {
      const q = query.toLowerCase();
      conversas = conversas.filter((c) => {
        const haystack = JSON.stringify(c).toLowerCase();
        return q.split(" ").some((term) => term.length > 2 && haystack.includes(term));
      });
    }

    return NextResponse.json({ ok: true, conversas });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
