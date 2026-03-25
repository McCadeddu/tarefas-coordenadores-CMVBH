export const runtime = "nodejs";

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getProcessosRepository } from "@/lib/server/processos/repository";

type Context = {
    params: Promise<{ slug: string; id: string }>;
};

function linha(doc: PDFKit.PDFDocument, label: string, valor: string) {
    doc.font("Helvetica-Bold").text(label, { continued: true });
    doc.font("Helvetica").text(valor);
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

        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (buffer) => buffers.push(buffer));

        doc.fontSize(18).fillColor("#1E3A8A").text(`Relatório do encontro - ${processo.nome}`);
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor("#111827");
        linha(doc, "Encontro: ", encontro.titulo);
        linha(doc, "Data: ", new Date(encontro.data_encontro).toLocaleDateString("pt-BR"));
        linha(doc, "Secretário: ", encontro.secretario || "Não informado");
        doc.moveDown();

        if (encontro.pauta_geral) {
            doc.font("Helvetica-Bold").text("Pauta geral");
            doc.font("Helvetica").text(encontro.pauta_geral);
            doc.moveDown();
        }

        doc.font("Helvetica-Bold").text("Presenças");
        encontro.presencas.forEach((presenca) => {
            doc.font("Helvetica").text(`• ${presenca.nome} - ${presenca.presente ? "Presente" : "Ausente"}`);
        });
        doc.moveDown();

        encontro.pautas.forEach((pauta) => {
            doc.font("Helvetica-Bold").fontSize(13).text(`${pauta.ordem}. ${pauta.titulo}`);
            doc.font("Helvetica").fontSize(11);
            if (pauta.relatorio) {
                doc.text(pauta.relatorio);
            } else {
                doc.text("Sem relatório preenchido.");
            }

            if (pauta.decisao_titulo) {
                doc.moveDown(0.3);
                doc.font("Helvetica-Bold").text(`Decisão: ${pauta.decisao_titulo}`);
                doc.font("Helvetica").text(
                    `Favoráveis: ${pauta.votos_favoraveis} | Contrários: ${pauta.votos_contrarios} | Abstenções: ${pauta.abstencoes}`
                );
                if (pauta.encaminhamento) {
                    doc.text(`Encaminhamento: ${pauta.encaminhamento}`);
                }
            }
            doc.moveDown();
        });

        doc.end();
        const pdf = await new Promise<Buffer>((resolve) => {
            doc.on("end", () => resolve(Buffer.concat(buffers)));
        });

        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="encontro-${slug}-${id}.pdf"`,
            },
        });
    } catch (error) {
        console.error("ERRO PDF ENCONTRO:", error);
        return NextResponse.json({ error: "Erro ao gerar PDF", details: String(error) }, { status: 500 });
    }
}
