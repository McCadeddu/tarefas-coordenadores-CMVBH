"use client";

import { useParams } from "next/navigation";
import NavTopo from "@/app/components/NavTopo";
import FormEncontroEquipe from "@/app/components/FormEncontroEquipe";

export default function NovoEncontroPage() {
    const { slug } = useParams<{ slug: string }>();

    return (
        <main className="min-h-screen bg-[var(--cmv-beige)] p-6 text-[var(--cmv-brown)]">
            <NavTopo titulo="Novo Encontro" />
            <FormEncontroEquipe slug={slug} title="Novo encontro de equipe" />
        </main>
    );
}
