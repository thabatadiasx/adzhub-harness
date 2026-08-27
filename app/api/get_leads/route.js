import { NextResponse } from "next/server";
import { readData } from "@/lib/data";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { utm_content } = body;

    const data = readData("api_crm_leads.json");
    let leads = data.leads;

    if (utm_content) {
      leads = leads.filter((l) => l.utm_content === utm_content);
    }

    return NextResponse.json({ ok: true, leads });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
