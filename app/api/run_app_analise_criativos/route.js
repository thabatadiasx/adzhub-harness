import { NextResponse } from "next/server";
import { readData } from "@/lib/data";

export async function POST() {
  try {
    const data = readData("app_analise_criativos.json");
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
