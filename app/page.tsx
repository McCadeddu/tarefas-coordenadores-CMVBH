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
    "Em curso",
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
        case "Em curso":
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
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
    });
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
        <div className="bg-white rounded-2xl shadow-md p-6 text-center border-t-4 border-[var(--cmv-blue)]">
            <p className={`text-4xl font-bold ${cor}`}>{valor}</p>
            <p className="mt-2 text-sm text-gray-700 uppercase tracking-wide">
                {label}
            </p>
        </div>
    );
}

// Função para obter a classe CSS do badge de status do processo
function classeStatus(status: string) {
    switch (status) {
        case "Ativo": return "badge-green";
        case "Atenção": return "badge-yellow";
        case "Transição": return "badge-orange";
        case "Planejado": return "badge-gray";
        case "Concluído": return "badge-blue";
        default: return "";
    }
}

export default function HomePage() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("Todos");
    const [filtroEtapa, setFiltroEtapa] = useState("Todas");

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

    /* ✅ FILTROS E ORDENAÇÃO – aplicados APENAS na renderização, sem alterar o estado original dos processos */
    const processosFiltrados = processos
        .filter(p => {
            const matchBusca =
                p.nome.toLowerCase().includes(busca.toLowerCase());

            const matchStatus =
                filtroStatus === "Todos" || p.status === filtroStatus;

            const matchEtapa =
                filtroEtapa === "Todas" || p.etapa === filtroEtapa;

            return matchBusca && matchStatus && matchEtapa;
        })
        .sort((a, b) =>
            new Date(b.data_inicio).getTime() -
            new Date(a.data_inicio).getTime()
        );

    return (
        <main className="min-h-screen bg-[var(--cmv-beige)]">
          <div className="max-w-6xl mx-auto px-6 py-10">

                {/* CABEÇALHO */}
                <header className="mb-10 border-b border-gray-300 pb-6">
                    <div className="flex flex-col items-center text-center gap-2">

                        {/* Ícone menor */}
                        <div className="h-8 w-8 overflow-hidden flex items-center justify-center">
                            <img
                                src="/logo-cmv.png"
                                alt="CMV"
                                className="h-full w-auto object-contain"
                            />
                        </div>

                        {/* Título */}
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--cmv-blue)]">
                                Processos da Coordenação
                            </h1>

                            <p className="text-xs text-gray-500">
                                CMV – Belo Horizonte
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            Ações
                        </p>
                        <div className="flex flex-wrap gap-3">

                            {/* Novo Processo */}
                            <Link href="/processos/novo" className="btn btn-primary">
                                ➕ Novo Processo
                            </Link>

                            <Link href="/processos" className="btn btn-secondary">
                                📋 Visualizar Processos
                            </Link>

                            <Link href="/projetar" className="btn btn-secondary">
                                🧭 Projetar Processos
                            </Link>

                        </div>
                    </div>                </header>

            {/* RESUMO */}
                <section className="mb-10 bg-white rounded shadow p-4 overflow-x-auto">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                        Resumo dos Processos
                    </h3>

                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-2 text-left">Status</th>
                                <th className="text-center">Quantidade</th>
                                <th className="text-center">Indicador</th>
                            </tr>
                        </thead>

                        <tbody>
                            {[
                                { label: "Ativo", valor: resumo.Ativo, cor: "badge-green" },
                                { label: "Atenção", valor: resumo.Atenção, cor: "badge-yellow" },
                                { label: "Transição", valor: resumo.Transição, cor: "badge-orange" },
                                { label: "Planejado", valor: resumo.Planejado, cor: "badge-gray" },
                                { label: "Concluído", valor: resumo.Concluído, cor: "badge-blue" },
                            ].map((item, i) => (
                                <tr key={i} className="border-t hover:bg-gray-50 transition">
                                    <td className="p-2 font-medium">{item.label}</td>

                                    <td className="text-center font-semibold">
                                        {item.valor}
                                    </td>

                                    <td className="text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${item.cor}`}>
                                            {item.label}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-[var(--cmv-blue)] bg-[var(--cmv-blue)]/10 font-bold">
                                <td className="p-2 text-[var(--cmv-blue)]">Total</td>

                                <td className="text-center text-[var(--cmv-blue)]">
                                    {processos.length}
                                </td>

                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">

                    {/* Busca */}
                    <input
                        type="text"
                        placeholder="Buscar por nome do processo..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm w-full md:w-64"
                    />

                    {/* Filtros */}
                    <div className="flex gap-2 flex-wrap">

                        <select
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cmv-blue)]"
                        >
                            <option>Todos</option>
                            <option>Ativo</option>
                            <option>Atenção</option>
                            <option>Transição</option>
                            <option>Planejado</option>
                            <option>Concluído</option>
                        </select>

                        <select
                            value={filtroEtapa}
                            onChange={(e) => setFiltroEtapa(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--cmv-blue)]"
                        >
                            <option>Todas</option>
                            <option>Planejamento</option>
                            <option>Em curso</option>
                            <option>Acompanhamento</option>
                            <option>Transição</option>
                            <option>Concluído</option>
                        </select>

                    </div>
                </section>

                {/* TABELA GERAL */}
                <section className="mb-12 bg-white rounded shadow p-4 overflow-x-auto">
                    <h3 className="text-lg font-semibold text-[var(--cmv-blue)] mb-4">
                        Visão Geral dos Processos
                    </h3>

                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-2 text-left">Nome</th>
                                <th>Status</th>
                                <th>Etapa</th>
                                <th>Início</th>
                                <th>Previsto</th>
                                <th>Âmbito</th>
                                <th>Tempo</th>
                            </tr>
                        </thead>

                        <tbody>
                            {processosFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-500">
                                        Nenhum processo encontrado
                                    </td>
                                </tr>
                            )}
                            {processosFiltrados.map(p => (
                                <tr key={p.id} className="border-t hover:bg-gray-50 transition">
                                    <td className="p-2">
                                        <Link href={`/processos/${p.slug}`} className="underline">
                                            {p.nome}
                                        </Link>
                                    </td>

                                    <td className="text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${classeStatus(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>

                                    <td className="text-center">{p.etapa}</td>
                                    <td className="text-center">{formatarMesAno(p.data_inicio)}</td>
                                    <td className="text-center">{formatarMesAno(p.data_prevista_fim)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
          </div>
       </main>
    );
}
