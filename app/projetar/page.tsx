//app/projetar/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Processo = {
    id: number;
    slug: string;
    nome: string;
    equipe: string | null;
    coord_atual: string | null;
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

function mesesDesde(data: string) {
    const inicio = new Date(data);
    const hoje = new Date();
    return (
        (hoje.getFullYear() - inicio.getFullYear()) * 12 +
        (hoje.getMonth() - inicio.getMonth())
    );
}

function formatarMesAno(data?: string | null) {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
    });
}

export default function ProjetarPage() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);

    const [busca, setBusca] = useState("");
    const [statusFiltro, setStatusFiltro] = useState("Todos");
    const router = useRouter();

    useEffect(() => {
        async function carregar() {
            const res = await fetch("/api/processos");
            const data = await res.json();
            setProcessos(data);
            setLoading(false);
        }
        carregar();
    }, []);

    if (loading) {
        return <p className="p-10 text-xl">Carregando…</p>;
    }

    const processosFiltrados = processos.filter((p) => {
        const matchBusca =
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.ambito.toLowerCase().includes(busca.toLowerCase());

        const matchStatus =
            statusFiltro === "Todos" || p.status === statusFiltro;

        return matchBusca && matchStatus;
    });
    function prioridade(p: Processo) {
        const meses = mesesDesde(p.etapa_desde);

        if (p.status === "Atenção") return 5;
        if (p.status === "Transição") return 4;
        if (meses >= 6) return 4;
        if (meses >= 3) return 3;
        if (p.status === "Ativo") return 2;
        return 1;
    }

    const processosOrdenados = [...processosFiltrados].sort(
        (a, b) => prioridade(b) - prioridade(a)
    );

    return (
        <main className="min-h-screen bg-[var(--cmv-beige)]">
            <div className="max-w-7xl mx-auto px-8 py-10">

                {/* TOPO */}
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--cmv-blue)]">
                            Processos da Coordenação
                        </h1>
                        <p className="text-lg text-gray-700">
                            CMV – Belo Horizonte · {new Date().toLocaleDateString("pt-BR")}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/"
                            className="border border-[var(--cmv-blue)] text-[var(--cmv-blue)] px-5 py-2 rounded-lg text-lg"
                        >
                            🔙 Voltar
                        </Link>

                        <button
                            onClick={() => document.documentElement.requestFullscreen()}
                            className="border border-[var(--cmv-blue)] text-[var(--cmv-blue)] px-5 py-2 rounded-lg text-lg"
                        >
                            🖥️ Tela cheia
                        </button>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-3 mb-8">

                    <input
                        type="text"
                        placeholder="Buscar processo..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="border rounded px-3 py-2 w-full md:w-1/3"
                    />

                    <select
                        value={statusFiltro}
                        onChange={(e) => setStatusFiltro(e.target.value)}
                        className="border rounded px-3 py-2"
                    >
                        <option value="Todos">Todos</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Atenção">Atenção</option>
                        <option value="Transição">Transição</option>
                        <option value="Planejado">Planejado</option>
                        <option value="Concluído">Concluído</option>
                    </select>

                    <button
                        onClick={() => {
                            setBusca("");
                            setStatusFiltro("Todos");
                        }}
                        className="px-4 py-2 bg-gray-200 rounded"
                    >
                        Limpar
                    </button>

                </div>

                {/* PROCESSOS */}
                <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {processosOrdenados.map((p) => {
                        const indice = ETAPAS.indexOf(p.etapa);
                        const cor = corDoStatus(p.status);

                        return (
                            <div
                                key={p.id}
                                onClick={() => router.push(`/processos/${p.slug}`)}
                                className={`
                                    group
                                    rounded-2xl
                                    p-6
                                    cursor-pointer
                                    border-2
                                    transition-all
                                    hover:shadow-2xl
                                    hover:scale-[1.02]
                                    hover:ring-2 hover:ring-[var(--cmv-blue)]
                                    active:scale-[0.99]

                                    ${mesesDesde(p.etapa_desde) >= 6 ? "border-red-400 bg-red-50" :
                                        mesesDesde(p.etapa_desde) >= 3 ? "border-yellow-400 bg-yellow-50" :
                                            "border-gray-200 bg-white"}
                                `}
                            >

                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-2xl font-bold text-[var(--cmv-blue)] group-hover:underline">
                                        {p.nome}
                                    </h2>
                                    <div className="flex items-center gap-3 text-sm font-medium">
                                        <span className="text-gray-600">{p.ambito}</span>

                                        <span className={`w-3 h-3 rounded-full ${corDoStatus(p.status)}`} />

                                        <span className="text-gray-800 font-semibold">{p.status}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold mt-1">
                                    {mesesDesde(p.etapa_desde) >= 6 && "🔴 Crítico"}
                                    {mesesDesde(p.etapa_desde) >= 3 && mesesDesde(p.etapa_desde) < 6 && "🟡 Atenção"}
                                    {mesesDesde(p.etapa_desde) < 3 && "🟢 Normal"}
                                </p>

                                <p className="text-xl mb-2">
                                    {iconeDaEtapa(p.etapa)} Etapa atual:{" "}
                                    <strong>{p.etapa}</strong>
                                </p>

                                <p className="text-lg text-gray-700 mb-4">
                                    {mesesDesde(p.etapa_desde) === 0
                                        ? "Etapa recente"
                                        : `Nesta etapa há ${mesesDesde(p.etapa_desde)} meses`}
                                    {" · "}
                                    Início: {formatarMesAno(p.data_inicio)}
                                    {" · "}
                                    Previsto: {formatarMesAno(p.data_prevista_fim)}
                                </p>

                                <div className="text-sm text-gray-700 mt-3 space-y-1">
                                    <div>👥 {p.equipe || "—"}</div>
                                    <div>👨🏽‍⚖️ {p.coord_atual || "Sem coordenação"}</div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    {ETAPAS.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-3 flex-1 rounded-full transition-all
                                                ${i <= indice ? cor : "bg-gray-200"}
                                            `}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>
        </main>
    );
}