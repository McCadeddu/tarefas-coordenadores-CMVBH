"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavTopo from "@/app/components/NavTopo";
import FormEncontroEquipe from "@/app/components/FormEncontroEquipe";

type Encontro = {
    id: number | string;
    titulo: string;
    data_encontro: string;
    pauta_geral: string | null;
    secretario: string | null;
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

export default function EditarEncontroPage() {
    const { slug, id } = useParams<{ slug: string; id: string }>();
    const [encontro, setEncontro] = useState<Encontro | null>(null);

    useEffect(() => {
        async function carregar() {
            const response = await fetch(`/api/processos/${slug}/encontros/${id}`);
            const data = await response.json();
            setEncontro(data);
        }

        carregar();
    }, [slug, id]);

    if (!encontro) {
        return <main className="p-6">Carregando...</main>;
    }

    return (
        <main className="min-h-screen bg-[var(--cmv-beige)] p-6 text-[var(--cmv-brown)]">
            <NavTopo titulo={encontro.titulo} />
            <FormEncontroEquipe slug={slug} encontro={encontro} title="Reabrir encontro de equipe" />
        </main>
    );
}
