//app/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Processo = {
    id: number;
    slug: string;
    nome: string;
    ambito: string;
    etapa: string;
    status: string;
    etapa_desde: string;
    data_inicio: string;
    data_prevista_fim: string | null;
};

const ETAPAS = [
    "Planejamento",
    "Execução",
    "Acompanhamento",
    "Transição",
    "Concluído",
];
// Função para obter a cor do status do processo
function corDoStatus(status: string) {
    switch (status) {
        case "Ativo":
            return "bg-green-500";
        case "Atenção":
            return "bg-yellow-400";
        case "Transição":
            return "bg-orange-400";
        case "Planejado":
            return "bg-gray-400";
        case "Concluído":
            return "bg-[var(--cmv-blue)]";
        default:
            return "bg-gray-400";
    }
}
// Função para obter o ícone da etapa atual do processo
function iconeDaEtapa(etapa: string) {
    switch (etapa) {
        case "Planejamento":
            return "📝";
        case "Execução":
            return "▶️";
        case "Acompanhamento":
            return "👀";
        case "Transição":
            return "🔄";
        case "Concluído":
            return "✅";
        default:
            return "•";
    }
}
// Função para calcular meses desde uma data até hoje
function mesesDesde(data: string) {
    const inicio = new Date(data);
    const hoje = new Date();
    return (
        (hoje.getFullYear() - inicio.getFullYear()) * 12 +
        (hoje.getMonth() - inicio.getMonth())
    );
}
// Função para formatar data no formato "MMM AAAA" (em português)
function formatarMesAno(data?: string | null) {
    if (!data) return "—";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
    });
}

export default function HomePage() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function carregar() {
            try {
                const res = await fetch("/api/processos");
                const data = await res.json();
                setProcessos(data);
            } catch {
                setProcessos([]);
            } finally {
                setLoading(false);
            }
        }
        carregar();
    }, []);

    if (loading) {
        return <p className="p-8">Carregando processos…</p>;
    }

    /* ✅ RESUMO – calculado UMA VEZ, no lugar certo */
    const resumo = {
        Ativo: processos.filter(p => p.status === "Ativo").length,
        Atenção: processos.filter(p => p.status === "Atenção").length,
        Transição: processos.filter(p => p.status === "Transição").length,
        Planejado: processos.filter(p => p.status === "Planejado").length,
        Concluído: processos.filter(p => p.status === "Concluído").length,
    };

    return (
        <main className="min-h-screen bg-[var(--cmv-beige)]">
          <div className="max-w-6xl mx-auto px-6 py-10">

                {/* CABEÇALHO */}
                <header className="mb-10 border-b border-gray-300 pb-6">
                    <h1 className="text-4xl font-bold text-[var(--cmv-blue)] mb-2">
                        Processos da Coordenação
                    </h1>
                    <p className="text-lg text-gray-700">
                        Comunidade Missionária de Villaregia – Belo Horizonte
                    </p>

                    <div className="mt-6 flex flex-wrap gap-4">

                        {/* Novo Processo */}
                        <Link
                            href="/processos/novo"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 
                   border-[#4BBBC8] text-[#4BBBC8] font-medium
                   hover:bg-[#4BBBC8] hover:text-white transition"
                        >
                            ➕ Novo Processo
                        </Link>

                        {/* Visualizar Processos */}
                        <Link
                            href="/processos"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 
                   border-[#4BBBC8] text-[#4BBBC8] font-medium
                   hover:bg-[#4BBBC8] hover:text-white transition"
                        >
                            📋 Visualizar Processos
                        </Link>

                        {/* Projetar Processos */}
                        <Link
                            href="/projetar"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 
                   border-[#4BBBC8] text-[#4BBBC8] font-medium
                   hover:bg-[#4BBBC8] hover:text-white transition"
                        >
                            🧭 Projetar Processos
                        </Link>

                    </div>
                </header>

            {/* RESUMO */}
                <section className="mb-12 grid grid-cols-2 md:grid-cols-5 gap-6">
                    <ResumoBox label="Ativos" valor={resumo.Ativo} cor="text-green-700" />
                    <ResumoBox label="Atenção" valor={resumo.Atenção} cor="text-yellow-600" />
                    <ResumoBox label="Transição" valor={resumo.Transição} cor="text-orange-600" />
                    <ResumoBox label="Planejados" valor={resumo.Planejado} cor="text-gray-600" />
                    <ResumoBox label="Concluídos" valor={resumo.Concluído} cor="text-[var(--cmv-blue)]" />
                </section>


            {/* LISTA DE PROCESSOS */}
                <section className="grid gap-8 md:grid-cols-2">
                  {processos.map(p => {
                    const indiceEtapaAtual = ETAPAS.indexOf(p.etapa);
                    const corFluxo = corDoStatus(p.status);

                    return (
                        <div key={p.id} className="bg-white rounded shadow p-5">
                            <h2 className="text-lg font-semibold text-[var(--cmv-blue)] mb-2">
                                <Link href={`/processos/${p.slug}`} className="underline">
                                    {p.nome}
                                </Link>
                            </h2>

                            <p className="text-sm mb-1">
                                {iconeDaEtapa(p.etapa)} Etapa: <strong>{p.etapa}</strong>
                            </p>

                            <p className="text-xs text-gray-600 mb-3">
                                {mesesDesde(p.etapa_desde) === 0
                                    ? "Etapa recente"
                                    : `Nesta etapa há ${mesesDesde(p.etapa_desde)} meses`}
                                {" · "}
                                Início: {formatarMesAno(p.data_inicio)}
                                {" · "}
                                Previsto: {formatarMesAno(p.data_prevista_fim)}
                            </p>

                            <div className="flex gap-2">
                                {ETAPAS.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-2 flex-1 rounded-full ${index <= indiceEtapaAtual ? corFluxo : "bg-gray-300"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                  })}
                </section>

            {/* LEGENDA */}
                <section className="mb-8 bg-white rounded shadow p-4">
                    <h3 className="text-sm font-semibold text-[var(--cmv-blue)] mb-3">
                        Legenda
                    </h3>

                    <div className="mb-3 flex flex-wrap gap-4 text-sm">
                        <span>📝 Planejamento</span>
                        <span>▶️ Execução</span>
                        <span>👀 Acompanhamento</span>
                        <span>🔄 Transição</span>
                        <span>✅ Concluído</span>
                    </div>
                </section>

          </div>
        </main>
);
}

/* Componente simples para o resumo */
function ResumoBox({
    label,
    valor,
    cor,
}: {
    label: string;
    valor: number;
    cor: string;
}) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <p className={`text-4xl font-bold ${cor}`}>{valor}</p>
            <p className="mt-2 text-sm text-gray-700 uppercase tracking-wide">
                {label}
            </p>
        </div>
    );
}
