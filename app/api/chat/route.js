import { NextResponse } from "next/server";
import { classifyIntent, runDiagnostico, runCriativos } from "@/lib/harness";

export async function POST(req) {
  try {
    const { message, apiKey, model } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Cole sua OPENROUTER_API_KEY no campo acima antes de enviar." },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json({ ok: false, error: "Mensagem vazia." }, { status: 400 });
    }

    const chosenModel = model || "openai/gpt-4o-mini";
    const steps = [];

    // Passo 1: Intent Extraction
    steps.push({ estado: "Intent Extraction", tool: "LLM (classificação)", status: "chamando" });
    const category = await classifyIntent({ apiKey, model: chosenModel, message });
    steps.push({ estado: "Intent Extraction", tool: "LLM (classificação)", status: "concluído", resumo: `Categoria identificada: "${category}"` });

    if (category === "diagnostico") {
      const result = await runDiagnostico({ req, apiKey, model: chosenModel, userMessage: message });
      return NextResponse.json({ ok: true, ...result, steps: [...steps, ...result.steps] });
    }

    if (category === "criativos") {
      const result = await runCriativos({ req, apiKey, model: chosenModel, userMessage: message });
      return NextResponse.json({ ok: true, ...result, steps: [...steps, ...result.steps] });
    }

    // Categoria "outro" - fallback ReAct genérico simplificado (sem pipeline fixo)
    steps.push({ estado: "Fallback genérico", tool: "-", status: "sem pipeline dedicado para esta categoria" });
    return NextResponse.json({
      ok: true,
      category: "outro",
      steps,
      answer:
        "Esse pedido não se encaixou nos fluxos dedicados deste protótipo (diagnóstico ou análise de criativos). Em uma versão completa, ele cairia num estado de ReAct genérico, sem pipeline fixo. Tente perguntar sobre a campanha Ômega 3 (diagnóstico) ou sobre pausar/variar criativos.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
