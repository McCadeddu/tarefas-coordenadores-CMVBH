// app/processos/[slug]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NavTopo from "../../components/NavTopo";
import { useRouter } from "next/navigation";
import DiscoProcesso from "../../components/DiscoProcesso";

type Objetivo = {
    id: number;
    ordem: number;
    titulo: string;
    data_inicio: string | null;
    data_fim_prevista: string | null;
    status: string | null;
};

type Processo = {
    slug: string;
    nome: string;
    ambito: string;
    equipe: string | null;
    coord_atual: string | null;
    coord_futuro: string | null;
    etapa: string;
    status: string;
    data_inicio: string;
    data_prevista_fim: string | null;

    objetivo_geral: string | null;
    objetivo_inicio: string | null;
    objetivo_fim_previsto: string | null;

    observacoes: string | null;
};

type Evento = {
    tipo: string;
    campo: string | null;
    valor_anterior: string | null;
    valor_novo: string | null;
    criado_em: string;
};

function textoEvento(e: Evento) {
    if (e.tipo === "CRIACAO") return "Processo criado";
    if (e.tipo === "MUDANCA_ETAPA") {
        return `Etapa mudou de "${e.valor_anterior}" para "${e.valor_novo}"`;
    }
    if (e.tipo === "EDICAO_CAMPO") {
        return `Campo "${e.campo}" alterado`;
    }
    return "Atualização no processo";
}

function dataHumana(data: string) {
    return new Date(data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function ProcessoPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const [processo, setProcesso] = useState<Processo | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
    const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);

    // Carrega os dados do processo, eventos e objetivos ao montar a página
    useEffect(() => {
        async function carregar() {
            const res = await fetch(`/api/processos/${slug}`);
            const data = await res.json();
            setProcesso(data);

            const resEventos = await fetch(`/api/processos/${slug}/eventos`);
            setEventos(await resEventos.json());

            const resObjetivos = await fetch(`/api/processos/${slug}/objetivos`);
            setObjetivos(await resObjetivos.json());
        }
        carregar();
    }, [slug]);

    if (!processo) return <p className="p-6">Carregando…</p>;

    // Função para excluir o processo, com confirmação do usuário e redirecionamento após exclusão
    async function excluirProcesso() {

        const res = await fetch(`/api/processos/${slug}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            alert("Erro ao excluir processo");
            return;
        }

        router.push("/processos");
    }
    function statusBadge(status: string) {
        const map: Record<string, string> = {
            Ativo: "badge-green",
            Atenção: "badge-yellow",
            Transição: "badge-orange",
            Planejado: "badge-gray",
            Concluído: "badge-blue",
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${map[status]}`}>
                {status}
            </span>
        );
    }

    return (
        <>
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">

                        <h2 className="text-lg font-semibold mb-3">
                            Confirmar exclusão
                        </h2>

                        <p className="text-sm text-gray-600 mb-6">
                            Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.
                        </p>

                        <div className="flex justify-end gap-3">

                            <button
                                onClick={() => setMostrarModal(false)}
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={async () => {
                                    await excluirProcesso();
                                    setMostrarModal(false);
                                }}
                                className="btn bg-red-600 text-white hover:bg-red-700"
                            >
                                Sim, excluir
                            </button>

                        </div>

                    </div>

                </div>
            )}

            <main className="min-h-screen p-6 bg-[var(--cmv-beige)] text-[var(--cmv-brown)]">

                <NavTopo titulo={processo.nome} />

                <header className="sticky top-0 z-10 bg-[var(--cmv-beige)] pb-4 mb-6 border-b">

                    <div className="flex items-center justify-between gap-4">

                        <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">
                            {processo.nome}
                        </h1>

                        <div className="flex gap-3">

                            <Link
                                href={`/processos/${processo.slug}/editar`}
                                className="btn btn-primary"
                            >
                                ✏️ Editar
                            </Link>

                            <button
                                onClick={() => setMostrarModal(true)}
                                className="btn bg-red-600 text-white hover:bg-red-700"
                            >
                                🗑️ Excluir
                            </button>

                        </div>

                    </div>

                </header>

                {/* INFO GERAL */}
                <section className="bg-white p-5 rounded-xl shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Âmbito:</strong> {processo.ambito}</div>
                    <div><strong>Etapa:</strong> {processo.etapa}</div>
                    <div><strong>Coordenação:</strong> {processo.coord_atual || "—"}</div>
                    <div><strong>Futuro:</strong> {processo.coord_futuro || "—"}</div>
                    <div><strong>Equipe:</strong> {processo.equipe || "—"}</div>
                    <div><strong>Status:</strong> {statusBadge(processo.status)}</div>
                </section>

                {/* OBJETIVO GERAL */}
                <section className="bg-white p-4 rounded shadow mb-6">
                    <h2 className="font-semibold mb-2">🎯 Objetivo Geral</h2>
                    <p>{processo.objetivo_geral || "—"}</p>
                </section>

                {/* OBJETIVOS */}
                <section className="bg-white p-4 rounded shadow mb-6">
                    <p><strong>Equipe:</strong> {processo.equipe || "—"}</p>
                    <p><strong>Observações:</strong> {processo.observacoes || "—"}</p>
                <h2 className="font-semibold mb-3">📍 Objetivos</h2>

                    {objetivos.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Nenhum objetivo cadastrado.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {objetivos.map((o) => (
                                <li key={o.id} className="border-l-4 border-[var(--cmv-blue)] pl-3 py-1">
                                    <p className="text-sm font-medium">
                                        {o.ordem}. {o.titulo}
                                    </p>

                                    <p className="text-xs text-gray-600">
                                        {o.status || "Planejado"} ·
                                        Início: {o.data_inicio || "—"} ·
                                        Previsto: {o.data_fim_prevista || "—"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* DISCO DO PROCESSO */}
                <section className="bg-white p-4 rounded shadow mb-6">
                    <h2 className="font-semibold mb-3">🧭 Linha do tempo visual</h2>

                    <DiscoProcesso processo={processo} objetivos={objetivos} />
                </section>

                {/* LINHA DO TEMPO */}
                <section>
                    <h2 className="font-semibold mb-3">🕒 Linha do tempo</h2>

                    <button
                        onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
                        className="text-sm underline mb-3"
                    >
                        {mostrarDetalhes ? "Ocultar detalhes" : "Mostrar detalhes"}
                    </button>

                    <ul className="space-y-3 border-l pl-4">
                        {eventos
                            .filter((e) =>
                                mostrarDetalhes ? true : e.tipo !== "EDICAO_CAMPO"
                            )
                            .map((e, i) => (
                                <li key={i} className="relative">
                                    <span className="absolute -left-[9px] top-1 w-3 h-3 bg-[var(--cmv-blue)] rounded-full" />

                                    <p className="text-sm">
                                        {textoEvento(e)}
                                    </p>

                                    <p className="text-xs text-gray-500">
                                        {dataHumana(e.criado_em)}
                                    </p>
                                </li>
                            ))}
                    </ul>
                </section>
            </main>
        </>
    );
}
