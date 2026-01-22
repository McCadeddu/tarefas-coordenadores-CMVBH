// app/processos/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Processo = {
    id: number;
    slug: string;
    nome: string;
    ambito: string;
    equipe: string;
    coord_atual: string;
    coord_futuro: string;
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
    if (!data) return "—";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
    });
}

export default function ProcessosPage() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);

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
            Concluído: "bg-blue-100 text-blue-800",
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${map[status]}`}>
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

    return (
        <main className="min-h-screen p-6 bg-[var(--cmv-beige)] text-[var(--cmv-brown)]">
            {/* Cabeçalho */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">
                    Processos da Coordenação – CMV BH
                </h1>
                <p className="text-sm text-gray-700">
                    Visão completa em formato de planilha única
                </p>
            </header>

            {/* Tabela */}
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="w-full border-collapse text-sm">
                    <thead className="bg-[var(--cmv-blue)] text-white">
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
                        {processos.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="p-4 text-center">
                                    Nenhum processo cadastrado.
                                </td>
                            </tr>
                        ) : (
                            processos.map((p) => (
                                <tr key={p.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-[var(--cmv-blue)]">
                                        <Link href={`/processos/${p.slug}`} className="underline">
                                            {p.nome}
                                        </Link>
                                    </td>
                                    <td className="p-3">{p.ambito}</td>
                                    <td className="p-3 text-gray-700">{p.equipe}</td>
                                    <td className="p-3">{p.coord_atual}</td>
                                    <td className="p-3 italic text-gray-600">
                                        {p.coord_futuro || "—"}
                                    </td>
                                    <td className="p-3">{p.etapa}</td>
                                    <td className="p-3">
                                        {formatarMesAno(p.etapa_desde)}
                                    </td>
                                    <td className="p-3">
                                        {mesesDesde(p.etapa_desde) === 0
                                            ? "recente"
                                            : `${mesesDesde(p.etapa_desde)} meses`}
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
