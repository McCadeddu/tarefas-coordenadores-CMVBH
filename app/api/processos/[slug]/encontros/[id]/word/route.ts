export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getProcessosRepository } from "@/lib/server/processos/repository";

type Context = {
    params: Promise<{ slug: string; id: string }>;
};

function escapeHtml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatarData(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("pt-BR");
}

export async function GET(_req: Request, { params }: Context) {
    try {
        const { slug, id } = await params;
        const repository = await getProcessosRepository();
        const processo = await repository.getProcessoBySlug(slug);
        const encontro = await repository.getEncontroById(slug, id);

        if (!processo || !encontro) {
            return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
        }

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatorio do encontro - ${escapeHtml(processo.nome)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 36px; color: #1f2937; line-height: 1.5; }
    h1 { color: #1e3a8a; font-size: 22px; margin-bottom: 18px; }
    h2 { color: #1f2937; font-size: 16px; margin: 20px 0 8px; }
    h3 { color: #1f2937; font-size: 14px; margin: 18px 0 6px; }
    p { margin: 6px 0; }
    ul { margin: 8px 0 12px 20px; }
    .meta strong { display: inline-block; min-width: 90px; }
    .bloco { margin-top: 16px; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 10px; }
  </style>
</head>
<body>
  <h1>Relatório do encontro - ${escapeHtml(processo.nome)}</h1>
  <div class="meta">
    <p><strong>Encontro:</strong> ${escapeHtml(encontro.titulo)}</p>
    <p><strong>Data:</strong> ${escapeHtml(formatarData(encontro.data_encontro))}</p>
    <p><strong>Secretário:</strong> ${escapeHtml(encontro.secretario || "Não informado")}</p>
  </div>
  ${encontro.pauta_geral ? `<div class="bloco"><h2>Pauta geral</h2><p>${escapeHtml(encontro.pauta_geral).replace(/\n/g, "<br />")}</p></div>` : ""}
  <div class="bloco">
    <h2>Presenças</h2>
    ${
        encontro.presencas.length > 0
            ? `<ul>${encontro.presencas
                .map((presenca) => `<li>${escapeHtml(presenca.nome)} - ${presenca.presente ? "Presente" : "Ausente"}</li>`)
                .join("")}</ul>`
            : "<p>Nenhuma presença registrada.</p>"
    }
  </div>
  <div class="bloco">
    <h2>Pautas e relatório</h2>
    ${
        encontro.pautas.length > 0
            ? encontro.pautas
                .map(
                    (pauta) => `
      <div>
        <h3>${escapeHtml(`${pauta.ordem}. ${pauta.titulo}`)}</h3>
        <p>${escapeHtml(pauta.relatorio || "Sem relatório preenchido.").replace(/\n/g, "<br />")}</p>
        ${
            pauta.decisao_titulo
                ? `<p><strong>Decisão:</strong> ${escapeHtml(pauta.decisao_titulo)}</p>
                   <p><strong>Votação:</strong> Favoráveis ${pauta.votos_favoraveis}, Contrários ${pauta.votos_contrarios}, Abstenções ${pauta.abstencoes}</p>`
                : ""
        }
        ${pauta.encaminhamento ? `<p><strong>Encaminhamento:</strong> ${escapeHtml(pauta.encaminhamento).replace(/\n/g, "<br />")}</p>` : ""}
      </div>`
                )
                .join("")
            : "<p>Nenhuma pauta registrada.</p>"
    }
  </div>
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "application/msword; charset=utf-8",
                "Content-Disposition": `attachment; filename="encontro-${slug}-${id}.doc"`,
            },
        });
    } catch (error) {
        console.error("ERRO WORD ENCONTRO:", error);
        return NextResponse.json({ error: "Erro ao gerar documento Word", details: String(error) }, { status: 500 });
    }
}
