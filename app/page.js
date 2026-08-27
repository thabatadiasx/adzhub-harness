"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const EXEMPLOS = [
  {
    label: "Diagnóstico",
    prompt: "Por que a campanha Ômega 3 teve retorno ruim e quais melhorias você daria?",
  },
  {
    label: "Análise de criativos",
    prompt: "Analisa os criativos da campanha Ômega 3, pausa os que estão fracos e propõe variações de CTA.",
  },
];

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openrouter/free");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [lastSteps, setLastSteps] = useState([]);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Estado do tema
  const [isMultiline, setIsMultiline] = useState(false);
  const textareaRef = useRef(null);

  const SINGLE_LINE_HEIGHT = 48; // px - altura aproximada de 1 linha com o padding atual
  const MAX_HEIGHT = 160; // px - altura máxima antes de rolar

  function autoResize(el) {
    if (!el) return;
    el.style.height = "auto"; // reseta pra recalcular do zero
    const newHeight = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${newHeight}px`;
    setIsMultiline(el.scrollHeight > SINGLE_LINE_HEIGHT + 4);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    autoResize(e.target);
  }

  async function sendMessage(text) {
    const msg = text ?? input;
    if (!msg.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    setLastSteps([]);
    setPendingApproval(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      setIsMultiline(false);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, apiKey, model }),
      });
      const data = await res.json();

      if (!data.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
        setLastSteps(data.steps || []);
        if (data.pendingApproval) setPendingApproval(data.pendingApproval);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Erro: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmApproval() {
    if (!pendingApproval) return;
    setLoading(true);
    try {
      const res = await fetch("/api/pause_ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_ids: pendingApproval.ad_ids, confirmed: true }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `✅ ${data.message}` },
      ]);
      setPendingApproval(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden transition-colors ${
      darkMode ? "bg-neutral-950 text-neutral-100" : "bg-slate-50 text-slate-800"
    }`}>
      {/* Header Superior */}
      <header className={`border-b px-8 py-4 flex items-center justify-between shadow-xs shrink-0 transition-colors ${
        darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
      }`}>
        <div>
          <h1 className={`text-base font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
            AdzChat — protótipo de harness
          </h1>
          <p className={`text-xs ${darkMode ? "text-neutral-400" : "text-slate-500"}`}>
            Cliente simulado: Housewhey · harness · loop de tools
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* Botão de Alternar Tema */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              darkMode
                ? "bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700"
                : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {darkMode ? "☀️ Claro" : "🌙 Escuro"}
          </button>

          <input
            type="password"
            placeholder="Cole sua OpenRouter API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#375aa0] ${
              darkMode ? "bg-neutral-800 border-neutral-700 text-white" : "bg-slate-50 border-slate-300 text-slate-800"
            } w-64`}
          />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={`border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#375aa0] ${
              darkMode ? "bg-neutral-800 border-neutral-700 text-white" : "bg-slate-50 border-slate-300 text-slate-800"
            }`}
          >
            <option value="openrouter/free">openrouter/free (roteador grátis)</option>
            <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
            <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
            <option value="google/gemini-flash-1.5">google/gemini-flash-1.5</option>
          </select>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col overflow-hidden">
        
        {/* Container do Dashboard */}
        <div className={`border rounded-xl shadow-xs overflow-hidden flex flex-col flex-1 h-full transition-colors ${
          darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
        }`}>
          
          <div className={`border-b px-6 py-2 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase shrink-0 ${
            darkMode ? "bg-neutral-900/50 border-neutral-800 text-[#7e9ad3]" : "bg-slate-50/50 border-slate-100 text-[#375aa0]"
          }`}>
            <span>Interface de Execução Harness</span>
          </div>

          <div className={`grid grid-cols-12 flex-1 divide-x overflow-hidden min-h-0 ${
            darkMode ? "divide-neutral-800" : "divide-slate-100"
          }`}>
            
            {/* Coluna Esquerda: PALCO */}
            <section className={`p-6 flex flex-col col-span-5 overflow-hidden ${
              darkMode ? "bg-neutral-950/40" : "bg-slate-50/30"
            }`}>
              <h2 className={`text-sm font-bold mb-1 shrink-0 ${darkMode ? "text-neutral-200" : "text-slate-800"}`}>
                Bastidores do Harness
              </h2>
              <p className={`text-[11px] leading-snug mb-4 shrink-0 ${darkMode ? "text-neutral-500" : "text-slate-400"}`}>
                Painel técnico para avaliação. No produto final, aqui apareceria o resultado gerado (criativos, pendências de aprovação) — não o caminho interno do harness.
              </p>

              <div className={`thin-scrollbar flex-1 overflow-y-auto space-y-3 pr-2 min-h-0 ${darkMode ? "dark-scrollbar" : ""}`}>
                {lastSteps.length === 0 ? (
                  <div className={`p-4 border border-dashed rounded-lg text-xs text-center ${
                    darkMode ? "border-neutral-800 text-neutral-500" : "border-slate-200 text-slate-400"
                  }`}>
                    Aguardando início de tarefas para exibir estados e ferramentas ativadas no palco.
                  </div>
                ) : (
                  lastSteps.map((s, i) => (
                    <div key={i} className={`border rounded-lg p-3 text-xs shadow-2xs ${
                      darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
                    }`}>
                      <div className={`font-semibold ${darkMode ? "text-neutral-200" : "text-slate-700"}`}>{s.estado}</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${darkMode ? "text-neutral-400" : "text-slate-500"}`}>{s.tool}</div>
                      <div className={`text-[10px] uppercase font-semibold mt-1 ${darkMode ? "text-[#7e9ad3]" : "text-[#375aa0]"}`}>{s.status}</div>
                      {s.resumo && <div className={`mt-1 text-[11px] ${darkMode ? "text-neutral-300" : "text-slate-600"}`}>{s.resumo}</div>}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Coluna Direita: CHAT */}
            <section className={`col-span-7 flex flex-col overflow-hidden ${darkMode ? "bg-neutral-900" : "bg-white"}`}>
              {/* Sugestões de Atalhos */}
              <div className={`flex gap-2 px-6 pt-4 pb-2 border-b shrink-0 ${
                darkMode ? "border-neutral-800" : "border-slate-100"
              }`}>
                {EXEMPLOS.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => sendMessage(ex.prompt)}
                    disabled={loading}
                    className={`text-xs font-medium rounded-full px-3 py-1 transition-colors disabled:opacity-50 ${
                      darkMode 
                        ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700" 
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              {/* Lista de Mensagens com Scroll */}
              <div className={`thin-scrollbar flex-1 overflow-y-auto p-6 space-y-4 min-h-0 ${darkMode ? "dark-scrollbar" : ""}`}>
                {messages.length === 0 && (
                  <p className={`text-xs text-center mt-10 ${darkMode ? "text-neutral-500" : "text-slate-400"}`}>
                    Insira sua chave API e digite um comando abaixo para iniciar.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#375aa0] text-white ml-auto rounded-tr-xs"
                        : darkMode
                        ? "bg-neutral-800 text-neutral-100 mr-auto rounded-tl-xs border border-neutral-700"
                        : "bg-slate-100 text-slate-800 mr-auto rounded-tl-xs border border-slate-200/60"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <div className={`prose prose-xs max-w-none ${darkMode ? "prose-invert text-neutral-100" : "text-slate-800"}`}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className={`text-xs flex items-center gap-2 ${darkMode ? "text-neutral-500" : "text-slate-400"}`}>
                    <span className="animate-pulse">●</span> Harness processando requisição...
                  </div>
                )}

                {pendingApproval && (
                  <div className={`border rounded-lg p-4 text-xs ${
                    darkMode ? "bg-amber-950/40 border-amber-800 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}>
                    <p className="font-semibold mb-1">⏸️ Ação de mutação pendente</p>
                    <p className="mb-3">Pausar {pendingApproval.ad_ids.length} anúncio(s). Bloqueado por política deny-first.</p>
                    <button
                      onClick={confirmApproval}
                      disabled={loading}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded px-3 py-1.5 font-medium transition-colors"
                    >
                      Confirmar e Executar
                    </button>
                  </div>
                )}
              </div>

              {/* Input Fixo no Rodapé */}
              <div className={`p-4 border-t shrink-0 ${
                darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-100"
              }`}>
                <div className={`border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#375aa0] ${
                  darkMode ? "bg-neutral-800 border-neutral-700" : "bg-slate-50 border-slate-200"
                }`}>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Peça uma tarefa..."
                    className={`thin-scrollbar w-full bg-transparent border-none px-4 pt-3 pb-1 text-sm leading-tight focus:outline-none resize-none overflow-y-auto block ${
                      darkMode ? "dark-scrollbar text-white placeholder-neutral-500" : "text-slate-800 placeholder-slate-400"
                    }`}
                    style={{ maxHeight: `${MAX_HEIGHT}px` }}
                  />
                  {/* Faixa própria do botão - fora da área de scroll do texto */}
                  <div className="flex justify-end items-center px-2 pb-2 pt-1">
                    <button
                      onClick={() => sendMessage()}
                      disabled={loading || !input.trim()}
                      aria-label="Enviar"
                      className="w-8 h-8 rounded-full bg-[#375aa0] hover:bg-[#2c4981] text-white transition-colors disabled:opacity-40 flex items-center justify-center shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}