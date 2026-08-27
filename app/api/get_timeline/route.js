import { NextResponse } from "next/server";
import { readData } from "@/lib/data";

export async function POST(req) {
  try {
    const { client_id, since, until } = await req.json();
    const timeline = readData("supercerebro_timeline.json");

    let events = timeline.events;
    if (since) events = events.filter((e) => e.occurred_at >= since);
    if (until) events = events.filter((e) => e.occurred_at <= until);

    return NextResponse.json({
      ok: true,
      client_id: client_id || timeline.client_id,
      events,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
