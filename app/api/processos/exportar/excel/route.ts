export const runtime = "nodejs";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getProcessosRepository } from "@/lib/server/processos/repository";

export async function GET() {
    const repository = await getProcessosRepository();
    const processos = await repository.listProcessos();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Coordena\u00e7\u00e3o dos processos");

    sheet.columns = [
        { header: "Processo", key: "nome", width: 30 },
        { header: "\u00c2mbito", key: "ambito", width: 20 },
        { header: "Equipe", key: "equipe", width: 30 },
        { header: "Coord. atual", key: "coord_atual", width: 20 },
        { header: "Coord. futura", key: "coord_futuro", width: 20 },
        { header: "Etapa", key: "etapa", width: 20 },
        { header: "Status", key: "status", width: 15 },
    ];

    sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E3A8A" },
    };
    sheet.getRow(1).font = { color: { argb: "FFFFFF" }, bold: true };

    processos.forEach((processo) => sheet.addRow(processo));

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="coordenacao-dos-processos.xlsx"',
        },
    });
}
