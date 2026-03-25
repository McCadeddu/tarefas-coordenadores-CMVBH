"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DiscoProcesso from "../../components/DiscoProcesso";
import EncontrosEquipeSection from "../../components/EncontrosEquipeSection";
import NavTopo from "../../components/NavTopo";
import { formatDateForDisplay } from "@/lib/shared/date";

type Objetivo = {
    id: number | string;
    ordem: number;
    titulo: string;
    data_inicio: string | null;
    data_fim_prevista: string | null;
    status: string | null;
};

type Evento = {
    tipo: string;
    campo: string | null;
    valor_anterior: string | null;
    valor_novo: string | null;
    observacao?: string | null;
    criado_em: string;
};

type Encontro = {
    id: number | string;
    processo_slug: string;
    titulo: string;
    data_encontro: string;
    pauta_geral: string | null;
    secretario: string | null;
    criado_em: string;
    atualizado_em: string;
    presencas: Array<{ id?: number | string; nome: string; presente: boolean }>;
    pautas: Array<{
        id?: number | string;
        ordem: number;
        titulo: string;
        relatorio: string | null;
        decisao_titulo: string | null;
        votos_favoraveis: number;
        votos_contrarios: number;
        abstencoes: number;
        encaminhamento: string | null;
    }>;
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

function textoEvento(evento: Evento) {
    if (evento.tipo === "CRIACAO") return "Processo criado";
    if (evento.tipo === "MUDANCA_ETAPA") {
        return `Etapa mudou de "${evento.valor_anterior}" para "${evento.valor_novo}"`;
    }
    if (evento.tipo === "EDICAO_CAMPO") {
        return `Campo "${evento.campo}" alterado`;
    }
    if (evento.tipo === "OBJETIVO" && evento.observacao) {
        return evento.observacao;
    }
    return evento.observacao || "Atualiza\u00e7\u00e3o no processo";
}

export default function ProcessoPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const [processo, setProcesso] = useState<Processo | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
    const [encontros, setEncontros] = useState<Encontro[]>([]);
    const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);

    useEffect(() => {
        let ativo = true;

        (async () => {
            const [resProcesso, resEventos, resObjetivos, resEncontros] = await Promise.all([
                fetch(`/api/processos/${slug}`),
                fetch(`/api/processos/${slug}/eventos`),
                fetch(`/api/processos/${slug}/objetivos`),
                fetch(`/api/processos/${slug}/encontros`),
            ]);

            const [processoJson, eventosJson, objetivosJson, encontrosJson] = await Promise.all([
                resProcesso.json(),
                resEventos.json(),
                resObjetivos.json(),
                resEncontros.json(),
            ]);

            if (!ativo) return;

            startTransition(() => {
                setProcesso(processoJson);
                setEventos(eventosJson);
                setObjetivos(objetivosJson);
                setEncontros(encontrosJson);
            });
        })();

        return () => {
            ativo = false;
        };
    }, [slug]);

    async function excluirProcesso() {
        const response = await fetch(`/api/processos/${slug}`, { method: "DELETE" });
        if (!response.ok) {
            alert("Erro ao excluir processo");
            return;
        }

        router.push("/processos");
    }

    function statusBadge(status: string) {
        const map: Record<string, string> = {
            Ativo: "badge-green",
            Aten\u00e7\u00e3o: "badge-yellow",
            Transi\u00e7\u00e3o: "badge-orange",
            Planejado: "badge-gray",
            Conclu\u00eddo: "badge-blue",
        };

        return (
            <span className={`rounded px-2 py-1 text-xs font-medium ${map[status] || "badge-gray"}`}>
                {status}
            </span>
        );
    }

    if (!processo) {
        return <p className="p-6">Carregando...</p>;
    }

    return (
        <>
            {mostrarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
                        <h2 className="mb-3 text-lg font-semibold">Confirmar exclus\u00e3o</h2>
                        <p className="mb-6 text-sm text-gray-600">
                            Tem certeza que deseja excluir este processo? Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setMostrarModal(false)} className="btn btn-secondary">
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

            <main className="min-h-screen bg-[var(--cmv-beige)] p-6 text-[var(--cmv-brown)]">
                <NavTopo titulo={processo.nome} />

                <header className="sticky top-0 z-10 mb-6 border-b bg-[var(--cmv-beige)] pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold text-[var(--cmv-blue)]">{processo.nome}</h1>
                        <div className="flex gap-3">
                            <Link href={`/processos/${processo.slug}/editar`} className="btn btn-primary">
                                Editar
                            </Link>
                            <button
                                onClick={() => setMostrarModal(true)}
                                className="btn bg-red-600 text-white hover:bg-red-700"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </header>

                <section className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 text-sm shadow md:grid-cols-2">
                    <div><strong>\u00c2mbito:</strong> {processo.ambito}</div>
                    <div><strong>Etapa:</strong> {processo.etapa}</div>
                    <div><strong>Coordena\u00e7\u00e3o:</strong> {processo.coord_atual || "-"}</div>
                    <div><strong>Futuro:</strong> {processo.coord_futuro || "-"}</div>
                    <div><strong>Equipe:</strong> {processo.equipe || "-"}</div>
                    <div><strong>Status:</strong> {statusBadge(processo.status)}</div>
                </section>

                <section className="mb-6 rounded-xl bg-white p-4 shadow">
                    <h2 className="mb-2 font-semibold">Objetivo Geral</h2>
                    <p>{processo.objetivo_geral || "-"}</p>
                </section>

                <section className="mb-6 rounded-xl bg-white p-4 shadow">
                    <div className="mb-3 flex flex-wrap gap-4 text-sm text-slate-600">
                        <p><strong>Equipe:</strong> {processo.equipe || "-"}</p>
                        <p><strong>Observa\u00e7\u00f5es:</strong> {processo.observacoes || "-"}</p>
                    </div>
                    <h2 className="mb-3 font-semibold">Objetivos</h2>
                    {objetivos.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum objetivo cadastrado.</p>
                    ) : (
                        <ul className="space-y-2">
                            {objetivos.map((objetivo) => (
                                <li key={objetivo.id} className="border-l-4 border-[var(--cmv-blue)] py-1 pl-3">
                                    <p className="text-sm font-medium">
                                        {objetivo.ordem}. {objetivo.titulo}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {objetivo.status || "Planejado"} {"\u2022"} In\u00edcio: {formatDateForDisplay(objetivo.data_inicio)} {"\u2022"} Previsto: {formatDateForDisplay(objetivo.data_fim_prevista)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="mb-6 rounded-xl bg-white p-4 shadow">
                    <h2 className="mb-3 font-semibold">Linha do tempo visual</h2>
                    <DiscoProcesso processo={processo} objetivos={objetivos} />
                </section>

                <EncontrosEquipeSection slug={slug} objetivos={objetivos} encontros={encontros} />

                <section className="mt-6">
                    <h2 className="mb-3 font-semibold">Linha do tempo do processo</h2>
                    <button onClick={() => setMostrarDetalhes(!mostrarDetalhes)} className="mb-3 text-sm underline">
                        {mostrarDetalhes ? "Ocultar detalhes" : "Mostrar detalhes"}
                    </button>
                    <ul className="space-y-3 border-l pl-4">
                        {eventos
                            .filter((evento) => (mostrarDetalhes ? true : evento.tipo !== "EDICAO_CAMPO"))
                            .map((evento, index) => (
                                <li key={`${evento.criado_em}-${index}`} className="relative">
                                    <span className="absolute -left-[9px] top-1 h-3 w-3 rounded-full bg-[var(--cmv-blue)]" />
                                    <p className="text-sm">{textoEvento(evento)}</p>
                                    <p className="text-xs text-gray-500">{formatDateForDisplay(evento.criado_em)}</p>
                                </li>
                            ))}
                    </ul>
                </section>
            </main>
        </>
    );
}
