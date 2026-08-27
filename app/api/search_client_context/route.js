import { NextResponse } from "next/server";
import { readData } from "@/lib/data";

// Simula GraphRAG: em vez de devolver o grafo inteiro, filtra nós/arestas
// relevantes por palavra-chave (aqui simplificado - produção usaria embeddings).
export async function POST(req) {
  try {
    const { query, client_id } = await req.json();

    if (!query) {
      return NextResponse.json({ ok: false, error: "query é obrigatório" }, { status: 400 });
    }

    const graph = readData("supercerebro_graph.json");
    const q = query.toLowerCase();

    // Passo 1: acha nós cujo label/type/props batem com a query
    const matchedNodes = graph.nodes.filter((n) => {
      const haystack = JSON.stringify(n).toLowerCase();
      return q.split(" ").some((term) => term.length > 2 && haystack.includes(term));
    });

    const matchedIds = new Set(matchedNodes.map((n) => n.id));

    // Passo 2: expande 1 hop - pega arestas conectadas aos nós encontrados
    const relatedEdges = graph.edges.filter(
      (e) => matchedIds.has(e.from) || matchedIds.has(e.to)
    );

    // Passo 3: inclui os nós do outro lado dessas arestas (contexto de vizinhança)
    const expandedIds = new Set(matchedIds);
    relatedEdges.forEach((e) => {
      expandedIds.add(e.from);
      expandedIds.add(e.to);
    });

    const expandedNodes = graph.nodes.filter((n) => expandedIds.has(n.id));

    return NextResponse.json({
      ok: true,
      query,
      client_id: client_id || graph.client_id,
      nodes: expandedNodes,
      edges: relatedEdges,
      _meta: {
        total_nodes_no_grafo: graph.nodes.length,
        nodes_retornados: expandedNodes.length,
        nota: "Subgrafo relevante (GraphRAG simulado) — não o grafo inteiro.",
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
