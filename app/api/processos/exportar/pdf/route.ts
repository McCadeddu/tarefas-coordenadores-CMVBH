export const runtime = "nodejs";

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getProcessosRepository } from "@/lib/server/processos/repository";
import { APP_NAME, LOCAL_COMMUNITY_LABEL } from "@/lib/shared/app-config";

export async function GET() {
    try {
        const repository = await getProcessosRepository();
        const processos = await repository.listProcessos();
        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on("data", (buffer) => buffers.push(buffer));
        doc.on("end", () => {});

        doc.fontSize(18).fillColor("#1E3A8A").text(APP_NAME);
        doc.fontSize(11).fillColor("#475569").text(LOCAL_COMMUNITY_LABEL);
        doc.moveDown();

        processos.forEach((processo) => {
            doc.fontSize(12).fillColor("#000000").text(processo.nome);
            doc
                .fontSize(10)
                .fillColor("#333333")
                .text(`\u00c2mbito: ${processo.ambito}`)
                .text(`Coordena\u00e7\u00e3o: ${processo.coord_atual || "-"}`)
                .text(`Etapa: ${processo.etapa} | Status: ${processo.status}`);

            doc.moveDown();
        });

        doc.end();

        return new NextResponse(Buffer.concat(buffers), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="coordenacao-dos-processos.pdf"',
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
