# AdzChat — Protótipo de Harness Agêntico

Protótipo do desafio técnico da AdzHub. Ilustra a tese defendida no paper: harness
híbrido orientado a estados (grafo de estados) + GraphRAG (busca de contexto no
grafo do supercérebro) + ReAct (sub-loops abertos para busca de contexto e geração
de conteúdo) + pipeline determinístico (tarefas com ordem fixa e crítica) + deny-first
(aprovação humana para ações de mutação).

Cliente simulado: **Housewhey** (e-commerce de suplementos), operação SPOT,
time Aline / Carolina / Luiza.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000, cole sua `OPENROUTER_API_KEY` no campo do topo,
escolha um modelo, e use um dos exemplos ou digite seu próprio pedido.

A key fica só no estado do React (na sessão do navegador) — não é persistida
em nenhum lugar do servidor.

## Tools (o que cada rota de API simula)

| Rota | Camada que simula | O que faz |
|---|---|---|
| `POST /api/search_client_context` | Supercérebro · grafo (GraphRAG) | Recebe `query`, devolve um **subgrafo relevante** (nós + arestas), não o grafo inteiro — simula busca vetorial + navegação de arestas |
| `POST /api/get_timeline` | Supercérebro · temporal | Eventos da conta, filtráveis por `since`/`until` |
| `POST /api/list_ads` | API Meta Ads | Lista anúncios (com spend, impressões, cliques, hook_rate, utm_content) |
| `POST /api/get_leads` | API CRM | Lista leads (com utm_content, origem_declarada, status, valor) |
| `POST /api/run_app_analise_criativos` | App de metodologia | Ranking de criativos com recomendação (seguir/pausar/variar) e briefs sugeridos |
| `POST /api/get_mapa_solucao` | App · contexto de marca | Ficha de marca (oferta, tom de voz, o que não pode falar) |
| `POST /api/search_conversations` | Memória textual (reunião/WhatsApp) | Busca em atas/conversas mockadas |
| `POST /api/pause_ads` | Ação de **mutação** | Implementa deny-first: sem `confirmed: true`, retorna `pending_approval` em vez de executar |
| `POST /api/chat` | **Harness** (ponto de entrada) | Faz Intent Extraction, roteia para o fluxo (diagnóstico/criativos), retorna `answer` + `steps` (o que o harness fez) |

Todos os dados vêm de `data/*.json` — mocks gerados a partir do `dataset_prompt.md`
do desafio, com 3 problemas plantados sem rótulo:

1. **Origem inconsistente** — vários leads têm `origem_declarada: "Instagram"` mas
   `utm_content` nulo (possível tráfego orgânico sendo contado como pago, ou UTM quebrada)
2. **Criativo saturado** — `ad_omega3_hook_prova` com hook_rate caindo (0.18)
3. **Aprovação travada** — peças de Namorados e Ômega 3 aguardando aprovação da
   Carolina há mais de uma semana

## Prompts de teste

1. **"Por que a campanha Ômega 3 teve retorno ruim e quais melhorias você daria?"**
   → cai no fluxo de **Diagnóstico**: GraphRAG busca contexto, pipeline fixo cruza
   `list_ads` × `get_leads` (spend × CPA), LLM interpreta e sugere melhorias.
   O avaliador deve ver, no painel lateral, os estados `Context Retrieval` →
   `Deterministic Execution` → `Evaluation`, e a resposta final mencionando a
   divergência de origem/UTM.

2. **"Analisa os criativos da campanha Ômega 3, pausa os que estão fracos e propõe
   variações de CTA."**
   → cai no fluxo de **Criativos**: GraphRAG busca contexto, chama o App de
   análise de criativos, ReAct gera variações de copy respeitando o tom de marca,
   e a ação de pausar fica **bloqueada** (deny-first) até o avaliador clicar em
   "Confirmar e executar" no card amarelo que aparece no chat.

3. **"Monta a pauta da próxima reunião com a Housewhey."**
   → não tem pipeline dedicado neste protótipo (cai no fallback "outro") —
   demonstra intencionalmente onde a solução ainda não cobre (ver seção de
   limitações do paper).

## O que é fake / simplificado (transparência para o avaliador)

- Não há integração real com Meta Ads / Google / CRM — tudo vem de JSON local.
- O "grafo do supercérebro" é um JSON estático com busca por palavra-chave, não
  embeddings reais — simula o comportamento do GraphRAG, não a implementação completa.
- O classificador de intenção (Intent Extraction) usa uma chamada simples ao LLM
  com poucas categorias fixas, não um classificador treinado.
- `pause_ads` não afeta nenhuma campanha real — é só uma simulação de resposta.

## Stack

Next.js (App Router) + React + Tailwind CSS. Backend e frontend no mesmo projeto
(API routes fazem o papel de tools do harness). LLM via OpenRouter, key inserida
pelo avaliador na própria UI.
