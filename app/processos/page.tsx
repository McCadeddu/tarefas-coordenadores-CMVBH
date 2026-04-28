// app/processos/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavTopo from "../components/NavTopo";
import { APP_NAME, LOCAL_COMMUNITY_LABEL } from "@/lib/shared/app-config";

type Processo = {
    id: number;
    slug: string;
    nome: string;
    ambito: string;
    equipe: string | null;
    coord_atual: string | null;
    coord_futuro: string | null;
    etapa: string;
    etapa_desde: string;
    status: string;
    data_inicio: string;
    data_prevista_fim: string | null;
};

function mesesDesde(data: string) {
    const inicio = new Date(data);
    const hoje = new Date();
    return (
        (hoje.getFullYear() - inicio.getFullYear()) * 12 +
        (hoje.getMonth() - inicio.getMonth())
    );
}

function formatarMesAno(data?: string | null) {
    if (!data || data === "") return "—";

    const d = new Date(data);

    if (isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
    });
}

export default function ProcessosPage() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
    const [busca, setBusca] = useState("");

    useEffect(() => {
        async function carregar() {
            try {
                const res = await fetch("/api/processos");
                const data = await res.json();
                setProcessos(data);
            } catch (err) {
                console.error("Erro ao carregar processos:", err);
                setProcessos([]);
            } finally {
                setLoading(false);
            }
        }
        carregar();
    }, []);

    function statusBadge(status: string) {
        const map: Record<string, string> = {
            Ativo: "bg-green-100 text-green-800",
            Atenção: "bg-yellow-100 text-yellow-800",
            Transição: "bg-orange-100 text-orange-800",
            Planejado: "bg-gray-100 text-gray-700",
            Concluído: "bg-indigo-100 text-indigo-800",
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
                {status}
            </span>
        );
    }

    if (loading) {
        return (
            <main className="p-6">
                <p>Carregando processos…</p>
            </main>
        );
    }

    // Aplicar filtros de status e busca antes de renderizar a tabela (otimização para grandes volumes de dados)
    const processosFiltrados = processos.filter((p) => {
        const matchStatus =
            filtroStatus === "Todos" || p.status === filtroStatus;

        const matchBusca =
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.ambito.toLowerCase().includes(busca.toLowerCase());

        return matchStatus && matchBusca;
    });

    return (
        <main className="min-h-screen p-6 bg-[var(--cmv-beige)] text-[var(--cmv-brown)]">

            <NavTopo titulo="Processos" />

            {/* Cabeçalho */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">
                    {APP_NAME}
                </h1>
                <p className="text-sm text-gray-700">
                    {LOCAL_COMMUNITY_LABEL} · visão completa em formato de planilha única
                </p>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">

                {["Ativo", "Atenção", "Transição", "Planejado", "Concluído"].map((status) => {
                    const total = processos.filter(p => p.status === status).length;

                    return (
                        <div
                            key={status}
                            onClick={() => setFiltroStatus(status)}
                            className="cursor-pointer bg-white rounded shadow p-4 text-center hover:scale-105 transition"
                        >
                            <div className="text-sm text-gray-500">{status}</div>
                            <div className="text-xl font-bold text-[var(--cmv-blue)]">
                                {total}
                            </div>
                        </div>
                    );
                })}

            </div>
            <div className="flex flex-col md:flex-row gap-3 mb-4">

                {/* Busca */}
                <input
                    type="text"
                    placeholder="Buscar processo..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="border rounded px-3 py-2 w-full md:w-1/3"
                />

                {/* Status */}
                <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="border rounded px-3 py-2"
                >
                    <option value="Todos">Todos</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Atenção">Atenção</option>
                    <option value="Transição">Transição</option>
                    <option value="Planejado">Planejado</option>
                    <option value="Concluído">Concluído</option>
                </select>

                {/* Reset */}
                <button
                    onClick={() => {
                        setFiltroStatus("Todos");
                        setBusca("");
                    }}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                    Limpar
                </button>

            </div>

            {/* Tabela */}
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="w-full border-collapse text-sm"
                    style={{ tableLayout: "fixed" }}>
                    <thead className="bg-[var(--cmv-blue)] text-white sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-left">Processo</th>
                            <th className="p-3 text-left">Âmbito</th>
                            <th className="p-3 text-left">Equipe</th>
                            <th className="p-3 text-left">Coord. Atual</th>
                            <th className="p-3 text-left">Futuro Coord.</th>
                            <th className="p-3 text-left">Etapa</th>
                            <th className="p-3 text-left">Desde</th>
                            <th className="p-3 text-left">Tempo</th>
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Início</th>
                            <th className="p-3 text-left">Prev. fim</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="p-4 text-center">
                                    Nenhum processo cadastrado.
                                </td>
                            </tr>
                        ) : (
                                processosFiltrados.map((p) => (
                                <tr
                                    key={p.id}
                                    className={`border-t cursor-pointer hover:bg-gray-50 
                                    ${mesesDesde(p.etapa_desde) >= 6 ? "bg-red-50" : ""
                                    }`}
                                    onClick={() => window.location.href = `/processos/${p.slug}`}
                                >
                                    <td className="p-3 font-semibold text-[var(--cmv-blue)] text-base">
                                        <span className="underline">{p.nome}</span>                                    </td>
                                    <td className="p-3">{p.ambito}</td>
                                    <td className="p-3 text-gray-700">{p.equipe || "—"}</td>
                                    <td className="p-3">{p.coord_atual || "—"}</td>
                                    <td className="p-3 italic text-gray-600">
                                        {p.coord_futuro || "—"}
                                    </td>
                                    <td className="p-3">{p.etapa}</td>
                                    <td className="p-3">
                                        {formatarMesAno(p.etapa_desde)}
                                    </td>
                                    <td className="p-3">
                                        {(() => {
                                            const meses = mesesDesde(p.etapa_desde);

                                            if (meses <= 0) return "🟢 recente";
                                            if (meses <= 2) return `${meses} meses`;
                                            if (meses <= 5) return `🟡 ${meses} meses`;
                                            return `🔴 ${meses} meses`;
                                        })()}
                                    </td>
                                    <td className="p-3">{statusBadge(p.status)}</td>
                                    <td className="p-3">
                                        {formatarMesAno(p.data_inicio)}
                                    </td>
                                    <td className="p-3">
                                        {formatarMesAno(p.data_prevista_fim)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Ações */}
            <footer className="flex gap-3 mt-6">
                <Link
                    href="/processos/novo"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[#4BBBC8] font-medium
                   hover:bg-[#4BBBC8] hover:text-white transition"
                >
                    ➕ Novo Processo
                </Link>
            </footer>
        </main>
    );
}
