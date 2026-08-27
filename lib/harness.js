// lib/harness.js
// Núcleo do harness: Intent Extraction -> Grafo de Estados -> (GraphRAG + pipeline
// fixo + ReAct) -> resposta. Cada função de estado registra um "step" que a UI
// usa para mostrar o painel "o que o harness está fazendo agora".

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callLLM({ apiKey, model, messages, temperature = 0.4 }) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function origin(req) {
  // usado pra montar URL absoluta das próprias API routes (tools)
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host");
  return `${proto}://${host}`;
}

async function callTool(req, path, body = {}) {
  const url = `${origin(req)}/api/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------- Passo 1: Intent Extraction ----------
export async function classifyIntent({ apiKey, model, message }) {
  const system = `Classifique a mensagem do usuário em EXATAMENTE uma destas 3 categorias:

diagnostico -> pedidos sobre: por que um resultado foi ruim/bom, causa de anomalia, CPA, ROI, investigar performance de campanha
criativos -> pedidos sobre: analisar criativos/anúncios, pausar anúncio, propor variações de copy/CTA/hook
outro -> qualquer outra coisa

Responda em UMA ÚNICA PALAVRA, exatamente "diagnostico" ou "criativos" ou "outro". Não escreva mais nada, sem pontuação, sem explicação.`;

  let normalized = "outro";
  try {
    const content = await callLLM({
      apiKey,
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      temperature: 0,
    });
    normalized = (content || "").trim().toLowerCase();
  } catch (err) {
    // se o LLM falhar na classificação, cai no fallback por palavra-chave abaixo
    normalized = "";
  }

  if (normalized.includes("diagnostico")) return "diagnostico";
  if (normalized.includes("criativos")) return "criativos";

  // Fallback por palavra-chave: alguns modelos gratuitos não seguem bem a
  // instrução de responder só uma palavra. Em vez de cair direto em "outro",
  // tentamos inferir pela própria mensagem do usuário antes de desistir.
  const msg = message.toLowerCase();
  const diagnosticoKeywords = ["por que", "porque", "causa", "cpa", "resultado ruim", "retorno ruim", "anomalia", "caiu", "piorou"];
  const criativosKeywords = ["criativo", "criativos", "pausa", "pausar", "cta", "copy", "variaç", "hook"];

  if (diagnosticoKeywords.some((k) => msg.includes(k))) return "diagnostico";
  if (criativosKeywords.some((k) => msg.includes(k))) return "criativos";

  return "outro";
}

// ---------- Fluxo: Diagnóstico ----------
// Estados: Context Retrieval (GraphRAG) -> Deterministic Execution (pipeline
// fixo) -> Evaluation (ReAct aberto para sugerir melhorias)
export async function runDiagnostico({ req, apiKey, model, userMessage }) {
  const steps = [];

  // Estado: Context Retrieval (GraphRAG simulado)
  steps.push({ estado: "Context Retrieval", tool: "search_client_context", status: "chamando" });
  const context = await callTool(req, "search_client_context", { query: "campanha Ômega 3 CPA resultado" });
  steps.push({
    estado: "Context Retrieval",
    tool: "search_client_context",
    status: "concluído",
    resumo: `${context.nodes?.length ?? 0} nós relevantes recuperados (subgrafo, não o grafo inteiro).`,
  });

  const timeline = await callTool(req, "get_timeline", {});
  steps.push({
    estado: "Context Retrieval",
    tool: "get_timeline",
    status: "concluído",
    resumo: `${timeline.events?.length ?? 0} eventos da linha do tempo recuperados.`,
  });

  // Estado: Deterministic Execution (pipeline fixo e travado)
  steps.push({ estado: "Deterministic Execution", tool: "list_ads", status: "chamando" });
  const adsResp = await callTool(req, "list_ads", { campaign_id: "camp_omega3" });
  steps.push({ estado: "Deterministic Execution", tool: "list_ads", status: "concluído", resumo: `${adsResp.ads?.length ?? 0} anúncios encontrados.` });

  steps.push({ estado: "Deterministic Execution", tool: "get_leads", status: "chamando" });
  const leadsResp = await callTool(req, "get_leads", {});
  steps.push({ estado: "Deterministic Execution", tool: "get_leads", status: "concluído", resumo: `${leadsResp.leads?.length ?? 0} leads encontrados.` });

  // Cruzamento determinístico (não é o LLM decidindo a ordem - é código fixo)
  const ads = adsResp.ads || [];
  const leads = leadsResp.leads || [];
  const cruzamento = ads.map((ad) => {
    const leadsDoAd = leads.filter((l) => l.utm_content === ad.ad_id);
    const vendas = leadsDoAd.filter((l) => l.status === "venda");
    const cpa = vendas.length > 0 ? (ad.spend / vendas.length).toFixed(2) : null;
    return {
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      spend: ad.spend,
      leads: leadsDoAd.length,
      vendas: vendas.length,
      cpa,
    };
  });

  const leadsSemUtm = leads.filter((l) => !l.utm_content && l.origem_declarada);

  steps.push({
    estado: "Deterministic Execution",
    tool: "cruzar_dados (código interno, sem LLM)",
    status: "concluído",
    resumo: `Cruzamento spend × leads × CPA calculado para ${cruzamento.length} anúncios. ${leadsSemUtm.length} leads sem UTM mas com origem declarada.`,
  });

  // Estado: Evaluation (LLM interpreta e depois ReAct para sugerir melhorias)
  steps.push({ estado: "Evaluation", tool: "LLM (interpretação + sugestões)", status: "chamando" });

  const mapaSolucao = await callTool(req, "get_mapa_solucao", {});
  const conversas = await callTool(req, "search_conversations", { query: "ômega 3 origem CPA" });

  const analysisPrompt = `Você é o harness de um agente de marketing. Com base nos dados abaixo, escreva uma resposta objetiva para o gestor explicando (1) a possível causa do resultado ruim da campanha Ômega 3 e (2) sugestões concretas de melhoria. Seja direto, cite números quando fizer sentido.

Pedido original do gestor: "${userMessage}"

Cruzamento spend x leads x CPA por anúncio:
${JSON.stringify(cruzamento, null, 2)}

Leads com origem declarada "Instagram" mas SEM utm_content (possível tráfego orgânico contado como pago, ou UTM quebrada):
${JSON.stringify(leadsSemUtm, null, 2)}

Contexto de marca (mapa de solução):
${JSON.stringify(mapaSolucao, null, 2)}

Trechos de conversas relevantes:
${JSON.stringify(conversas.conversas, null, 2)}`;

  const answer = await callLLM({
    apiKey,
    model,
    messages: [
      { role: "system", content: "Você é um harness de marketing que já buscou os dados necessários. Responda em português, de forma clara e acionável." },
      { role: "user", content: analysisPrompt },
    ],
  });

  steps.push({ estado: "Evaluation", tool: "LLM (interpretação + sugestões)", status: "concluído" });

  return { category: "diagnostico", steps, answer };
}

// ---------- Fluxo: Criativos ----------
// Estados: Context Retrieval (GraphRAG) -> App de metodologia -> Evaluation
// (ReAct aberto gerando variações) -> Human Approval (deny-first)
export async function runCriativos({ req, apiKey, model, userMessage }) {
  const steps = [];

  steps.push({ estado: "Context Retrieval", tool: "search_client_context", status: "chamando" });
  const context = await callTool(req, "search_client_context", { query: "criativos Ômega 3 aprovação" });
  steps.push({
    estado: "Context Retrieval",
    tool: "search_client_context",
    status: "concluído",
    resumo: `${context.nodes?.length ?? 0} nós relevantes recuperados.`,
  });

  steps.push({ estado: "App de metodologia", tool: "run_app_analise_criativos", status: "chamando" });
  const analise = await callTool(req, "run_app_analise_criativos", {});
  steps.push({
    estado: "App de metodologia",
    tool: "run_app_analise_criativos",
    status: "concluído",
    resumo: `Ranking de ${analise.ranking?.length ?? 0} criativos recebido (App, não reimplementado no prompt).`,
  });

  const mapaSolucao = await callTool(req, "get_mapa_solucao", {});
  steps.push({ estado: "Evaluation", tool: "get_mapa_solucao", status: "concluído" });

  const paraPausar = (analise.ranking || []).filter((r) => r.recomendacao === "pausar");

  // Sub-loop ReAct: LLM gera variações de copy/CTA com base no contexto de marca
  steps.push({ estado: "Evaluation", tool: "LLM (ReAct - gerar variações)", status: "chamando" });
  const creativePrompt = `Você é o harness de um agente de marketing. Com base no ranking de criativos e no contexto de marca abaixo, escreva uma resposta para o gestor: (1) quais anúncios recomenda pausar e por quê, (2) proponha 3 variações de copy/CTA novas, respeitando o tom de voz e as restrições da marca.

Pedido original do gestor: "${userMessage}"

Ranking e briefs sugeridos pelo App de análise de criativos:
${JSON.stringify(analise, null, 2)}

Contexto de marca (mapa de solução):
${JSON.stringify(mapaSolucao, null, 2)}`;

  const answer = await callLLM({
    apiKey,
    model,
    messages: [
      { role: "system", content: "Você é um harness de marketing. Responda em português, de forma objetiva e prática." },
      { role: "user", content: creativePrompt },
    ],
  });
  steps.push({ estado: "Evaluation", tool: "LLM (ReAct - gerar variações)", status: "concluído" });

  // Estado: Human Approval (deny-first) - propõe pausar, mas não executa
  let pendingApproval = null;
  if (paraPausar.length > 0) {
    steps.push({ estado: "Human Approval", tool: "pause_ads", status: "chamando (deny-first)" });
    const pauseResp = await callTool(req, "pause_ads", {
      ad_ids: paraPausar.map((p) => p.ad_id),
      confirmed: false,
    });
    steps.push({
      estado: "Human Approval",
      tool: "pause_ads",
      status: "bloqueado - aguardando confirmação humana",
      resumo: pauseResp.message,
    });
    pendingApproval = { ad_ids: paraPausar.map((p) => p.ad_id) };
  }

  return { category: "criativos", steps, answer, pendingApproval };
}