import { NextResponse } from "next/server";

// Implementa a política deny-first: toda ação de mutação (aqui, pausar anúncios)
// exige um campo "confirmed: true" explícito. Sem isso, a tool retorna um
// "pending approval" em vez de executar - simula o estado de Human Approval
// do grafo de estados do harness.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ad_ids, confirmed } = body;

    if (!ad_ids || !Array.isArray(ad_ids) || ad_ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ad_ids é obrigatório (array)" }, { status: 400 });
    }

    if (!confirmed) {
      return NextResponse.json({
        ok: true,
        status: "pending_approval",
        ad_ids,
        message:
          "Ação de mutação bloqueada por política deny-first. Aguardando confirmação humana explícita antes de executar.",
      });
    }

    // Simulação: em um harness real, aqui chamaria a Meta Ads API de fato.
    return NextResponse.json({
      ok: true,
      status: "executed",
      ad_ids,
      message: `${ad_ids.length} anúncio(s) pausado(s) com sucesso (simulado).`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
