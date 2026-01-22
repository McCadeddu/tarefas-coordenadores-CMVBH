// app/api/processos/exportar/excel/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "../../db";
import ExcelJS from "exceljs";

export async function GET() {
    const processos = db
        .prepare(
            `SELECT nome, ambito, equipe, coord_atual, coord_futuro, etapa, status
       FROM processos
       ORDER BY nome`
        )
        .all();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Processos CMV BH");

    sheet.columns = [
        { header: "Processo", key: "nome", width: 30 },
        { header: "Âmbito", key: "ambito", width: 20 },
        { header: "Equipe", key: "equipe", width: 30 },
        { header: "Coord. Atual", key: "coord_atual", width: 20 },
        { header: "Futuro Coord.", key: "coord_futuro", width: 20 },
        { header: "Etapa", key: "etapa", width: 20 },
        { header: "Status", key: "status", width: 15 },
    ];

    // Cabeçalho legível
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E3A8A" }, // azul CMV
    };
    sheet.getRow(1).font = { color: { argb: "FFFFFF" }, bold: true };

    processos.forEach((p) => sheet.addRow(p));

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="processos-cmv-bh.xlsx"',
        },
    });
}
