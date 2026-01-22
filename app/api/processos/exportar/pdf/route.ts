// app/api/processos/exportar/pdf/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "../../db";
import PDFDocument from "pdfkit";

export async function GET() {
    try {
        const processos = db
            .prepare(
                `SELECT nome, ambito, coord_atual, etapa, status
         FROM processos
         ORDER BY nome`
            )
            .all();

        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on("data", (b) => buffers.push(b));
        doc.on("end", () => { });

        /* TÍTULO — fonte padrão embutida */
        doc
            .fontSize(18)
            .fillColor("#1E3A8A")
            .text("Processos da Coordenação – CMV BH");

        doc.moveDown();

        processos.forEach((p: any) => {
            doc
                .fontSize(12)
                .fillColor("#000000")
                .text(p.nome);

            doc
                .fontSize(10)
                .fillColor("#333333")
                .text(`Âmbito: ${p.ambito}`)
                .text(`Coordenação: ${p.coord_atual || "-"}`)
                .text(`Etapa: ${p.etapa} | Status: ${p.status}`);

            doc.moveDown();
        });

        doc.end();

        const pdfBuffer = Buffer.concat(buffers);

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="processos-cmv-bh.pdf"',
            },
        });
    } catch (error) {
        console.error("ERRO PDF:", error);
        return NextResponse.json(
            { error: "Erro ao gerar PDF", details: String(error) },
            { status: 500 }
        );
    }
}
