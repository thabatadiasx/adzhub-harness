import { NextResponse } from "next/server";
import { readData } from "@/lib/data";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { campaign_id } = body;

    const data = readData("api_meta_ads.json");
    let campaigns = data.campaigns;

    if (campaign_id) {
      campaigns = campaigns.filter((c) => c.campaign_id === campaign_id);
    }

    // achata pra lista simples de ads, útil pro harness
    const ads = campaigns.flatMap((c) =>
      c.adsets.flatMap((as) =>
        as.ads.map((ad) => ({
          ...ad,
          campaign_id: c.campaign_id,
          campaign_name: c.campaign_name,
          adset_id: as.adset_id,
          adset_name: as.adset_name,
        }))
      )
    );

    return NextResponse.json({ ok: true, ads });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
