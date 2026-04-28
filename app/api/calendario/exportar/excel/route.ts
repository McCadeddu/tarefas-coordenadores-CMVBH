export const runtime = "nodejs";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { extractMonthlyOccurrences, type CalendarOccurrence } from "@/lib/server/calendar/ics";
import {
    getCommunityCalendarConfig,
    resolvePublishedCalendarIcsUrl,
} from "@/lib/server/community-calendars";

type ParsedMonth = {
    year: number;
    month: number;
    label: string;
};

type WeekRange = {
    start: Date;
    end: Date;
    index: number;
};

function currentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | null): ParsedMonth | null {
    const safeValue = value || currentMonthValue();
    const match = safeValue.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;

    return { year, month, label: safeValue };
}

function addDays(date: Date, amount: number) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + amount);
    return copy;
}

function startOfWeekMonday(date: Date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + offset);
    return copy;
}

function endOfWeekSunday(date: Date) {
    return addDays(startOfWeekMonday(date), 6);
}

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
    });
}

function monthSheetLabel(year: number, month: number) {
    const shortMonth = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: "short",
    });
    return `${String(month).padStart(2, "0")} ${shortMonth.replace(".", "")}`;
}

function weekSheetLabel(index: number, start: Date, end: Date) {
    const startLabel = `${String(start.getDate()).padStart(2, "0")}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const endLabel = `${String(end.getDate()).padStart(2, "0")}-${String(end.getMonth() + 1).padStart(2, "0")}`;
    return `Sem ${index} ${startLabel} a ${endLabel}`;
}

function formatWeekDayHeader(date: Date) {
    const weekday = date
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", "")
        .replace(/^\w/, (char) => char.toUpperCase());
    return `${weekday} ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatWeekRangeLabel(start: Date, end: Date) {
    return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
}

function excelColumnName(index: number) {
    let dividend = index;
    let columnName = "";

    while (dividend > 0) {
        const modulo = (dividend - 1) % 26;
        columnName = String.fromCharCode(65 + modulo) + columnName;
        dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
}

function parseOccurrenceDate(value: string) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    return {
        day: Number(match[1]),
        month: Number(match[2]),
        year: Number(match[3]),
    };
}

function isoDateFromParts(parts: { year: number; month: number; day: number }) {
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function isoDateFromDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseTimeToMinutes(value: string) {
    if (value === "Dia inteiro") return null;
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

function buildTimedLabel(occurrence: CalendarOccurrence) {
    const parts = [`${occurrence.startTime}\u2013${occurrence.endTime}`, occurrence.summary];
    if (occurrence.location && occurrence.location !== "-") {
        parts.push(occurrence.location);
    }
    return parts.join("\n");
}

function buildAllDayLabel(occurrence: CalendarOccurrence) {
    const parts = [occurrence.summary];
    if (occurrence.location && occurrence.location !== "-") {
        parts.push(occurrence.location);
    }
    return parts.join("\n");
}

function listTouchedHours(occurrence: CalendarOccurrence) {
    const startMinutes = parseTimeToMinutes(occurrence.startTime);
    const endMinutes = parseTimeToMinutes(occurrence.endTime);

    if (startMinutes === null || endMinutes === null) return [];

    const safeEndMinutes = endMinutes <= startMinutes ? startMinutes + 60 : endMinutes;
    const firstHour = Math.max(0, Math.floor(startMinutes / 60));
    const lastHour = Math.min(23, Math.floor((safeEndMinutes - 1) / 60));
    const hours: number[] = [];

    for (let hour = firstHour; hour <= lastHour; hour += 1) {
        hours.push(hour);
    }

    return hours;
}

function addEntry(map: Map<string, string[]>, key: string, value: string) {
    const current = map.get(key) || [];
    current.push(value);
    map.set(key, current);
}

function isSameTargetMonth(date: Date, year: number, month: number) {
    return date.getFullYear() === year && date.getMonth() + 1 === month;
}

function createWeekRangesForMonth(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstWeekStart = startOfWeekMonday(firstDay);
    const lastWeekEnd = endOfWeekSunday(lastDay);
    const ranges: WeekRange[] = [];

    let cursor = new Date(firstWeekStart.getTime());
    let index = 1;

    while (cursor <= lastWeekEnd) {
        const weekStart = new Date(cursor.getTime());
        const weekEnd = addDays(weekStart, 6);
        ranges.push({ start: weekStart, end: weekEnd, index });
        cursor = addDays(cursor, 7);
        index += 1;
    }

    return ranges;
}

function dedupeOccurrences(occurrences: CalendarOccurrence[]) {
    const map = new Map<string, CalendarOccurrence>();

    occurrences.forEach((occurrence) => {
        const key = [
            occurrence.summary,
            occurrence.location,
            occurrence.startDate,
            occurrence.startTime,
            occurrence.endDate,
            occurrence.endTime,
        ].join("|");
        map.set(key, occurrence);
    });

    return Array.from(map.values()).sort((a, b) => a.startSortKey.localeCompare(b.startSortKey));
}

function createMonthlyGrid(
    sheet: ExcelJS.Worksheet,
    occurrences: CalendarOccurrence[],
    year: number,
    month: number,
    calendarLabel: string
) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const allDayByDay = new Map<number, string[]>();
    const timedByDayHour = new Map<string, string[]>();

    occurrences.forEach((occurrence) => {
        const parts = parseOccurrenceDate(occurrence.startDate);
        if (!parts || parts.month !== month || parts.year !== year) return;

        if (occurrence.allDay) {
            const current = allDayByDay.get(parts.day) || [];
            current.push(buildAllDayLabel(occurrence));
            allDayByDay.set(parts.day, current);
            return;
        }

        const label = buildTimedLabel(occurrence);
        listTouchedHours(occurrence).forEach((hour) => {
            addEntry(timedByDayHour, `${parts.day}-${hour}`, label);
        });
    });

    const maxAllDayRows = Math.max(1, ...Array.from(allDayByDay.values()).map((items) => items.length));
    const totalColumns = daysInMonth + 1;
    const lastColumn = excelColumnName(totalColumns);

    sheet.columns = [
        { key: "time", width: 11 },
        ...Array.from({ length: daysInMonth }, () => ({ width: 18 })),
    ];

    sheet.mergeCells(`A1:${lastColumn}1`);
    sheet.getCell("A1").value = `Calend\u00e1rio mensal de ${calendarLabel}`;
    sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFF" } };
    sheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E3A8A" },
    };
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 24;

    sheet.mergeCells(`A2:${lastColumn}2`);
    sheet.getCell("A2").value =
        `M\u00eas de refer\u00eancia: ${formatMonthLabel(year, month)} \u00b7 dias nas colunas e horas nas linhas`;
    sheet.getCell("A2").font = { italic: true, color: { argb: "475569" } };
    sheet.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };

    const headerRow = sheet.getRow(4);
    headerRow.getCell(1).value = "Hora";
    headerRow.getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0F172A" },
    };

    for (let day = 1; day <= daysInMonth; day += 1) {
        const columnIndex = day + 1;
        const cell = headerRow.getCell(columnIndex);
        const jsDate = new Date(year, month - 1, day);
        const isWeekend = jsDate.getDay() === 0 || jsDate.getDay() === 6;

        cell.value = formatWeekDayHeader(jsDate);
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isWeekend ? "64748B" : "4BBBC8" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
    headerRow.height = 28;

    for (let offset = 0; offset < maxAllDayRows; offset += 1) {
        const rowNumber = 5 + offset;
        const row = sheet.getRow(rowNumber);
        row.height = 36;

        const labelCell = row.getCell(1);
        labelCell.value = offset === 0 ? "Dia inteiro" : "";
        labelCell.font = { bold: offset === 0, color: { argb: "334155" } };
        labelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E2E8F0" },
        };
        labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

        for (let day = 1; day <= daysInMonth; day += 1) {
            const cell = row.getCell(day + 1);
            cell.value = allDayByDay.get(day)?.[offset] || "";
            cell.alignment = { vertical: "top", wrapText: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "F8FAFC" },
            };
            cell.border = {
                top: { style: "thin", color: { argb: "CBD5E1" } },
                left: { style: "thin", color: { argb: "CBD5E1" } },
                bottom: { style: "thin", color: { argb: "CBD5E1" } },
                right: { style: "thin", color: { argb: "CBD5E1" } },
            };
        }
    }

    const firstHourRow = 5 + maxAllDayRows;
    for (let hour = 0; hour < 24; hour += 1) {
        const rowNumber = firstHourRow + hour;
        const row = sheet.getRow(rowNumber);
        row.height = 48;

        const hourCell = row.getCell(1);
        hourCell.value = `${String(hour).padStart(2, "0")}:00`;
        hourCell.font = { bold: true, color: { argb: "334155" } };
        hourCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E2E8F0" },
        };
        hourCell.alignment = { horizontal: "center", vertical: "middle" };
        hourCell.border = {
            top: { style: "thin", color: { argb: "CBD5E1" } },
            left: { style: "thin", color: { argb: "CBD5E1" } },
            bottom: { style: "thin", color: { argb: "CBD5E1" } },
            right: { style: "thin", color: { argb: "CBD5E1" } },
        };

        for (let day = 1; day <= daysInMonth; day += 1) {
            const cell = row.getCell(day + 1);
            const items = timedByDayHour.get(`${day}-${hour}`) || [];
            cell.value = items.join("\n\n");
            cell.alignment = { vertical: "top", wrapText: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: hour % 2 === 0 ? "FFFFFF" : "F8FAFC" },
            };
            cell.border = {
                top: { style: "thin", color: { argb: "CBD5E1" } },
                left: { style: "thin", color: { argb: "CBD5E1" } },
                bottom: { style: "thin", color: { argb: "CBD5E1" } },
                right: { style: "thin", color: { argb: "CBD5E1" } },
            };
        }
    }

    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];
    sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: false,
        horizontalCentered: false,
        verticalCentered: false,
    };
}

function createWeeklyGrid(
    sheet: ExcelJS.Worksheet,
    occurrences: CalendarOccurrence[],
    weekRange: WeekRange,
    targetYear: number,
    targetMonth: number,
    calendarLabel: string
) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekRange.start, index));
    const dayKeys = days.map((day) => isoDateFromDate(day));
    const allDayByDate = new Map<string, string[]>();
    const timedByDateHour = new Map<string, string[]>();
    const totalColumns = 8;
    const lastColumn = excelColumnName(totalColumns);

    occurrences.forEach((occurrence) => {
        const parts = parseOccurrenceDate(occurrence.startDate);
        if (!parts) return;

        const dateKey = isoDateFromParts(parts);
        if (!dayKeys.includes(dateKey)) return;

        if (occurrence.allDay) {
            addEntry(allDayByDate, dateKey, buildAllDayLabel(occurrence));
            return;
        }

        const label = buildTimedLabel(occurrence);
        listTouchedHours(occurrence).forEach((hour) => {
            addEntry(timedByDateHour, `${dateKey}-${hour}`, label);
        });
    });

    const maxAllDayRows = Math.max(1, ...Array.from(allDayByDate.values()).map((items) => items.length));

    sheet.columns = [
        { key: "time", width: 11 },
        ...Array.from({ length: 7 }, () => ({ width: 24 })),
    ];

    sheet.mergeCells(`A1:${lastColumn}1`);
    sheet.getCell("A1").value = `Calend\u00e1rio semanal de ${calendarLabel}`;
    sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFF" } };
    sheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E3A8A" },
    };
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 24;

    sheet.mergeCells(`A2:${lastColumn}2`);
    sheet.getCell("A2").value =
        `Semana ${weekRange.index} \u00b7 ${formatWeekRangeLabel(weekRange.start, weekRange.end)} \u00b7 segunda-feira a domingo`;
    sheet.getCell("A2").font = { italic: true, color: { argb: "475569" } };
    sheet.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };

    const headerRow = sheet.getRow(4);
    headerRow.getCell(1).value = "Hora";
    headerRow.getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0F172A" },
    };

    days.forEach((day, index) => {
        const cell = headerRow.getCell(index + 2);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const insideTargetMonth = isSameTargetMonth(day, targetYear, targetMonth);

        cell.value = formatWeekDayHeader(day);
        cell.font = {
            bold: true,
            color: { argb: "FFFFFF" },
            italic: !insideTargetMonth,
        };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: insideTargetMonth ? (isWeekend ? "64748B" : "4BBBC8") : "94A3B8",
            },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    headerRow.height = 30;

    for (let offset = 0; offset < maxAllDayRows; offset += 1) {
        const rowNumber = 5 + offset;
        const row = sheet.getRow(rowNumber);
        row.height = 40;

        const labelCell = row.getCell(1);
        labelCell.value = offset === 0 ? "Dia inteiro" : "";
        labelCell.font = { bold: offset === 0, color: { argb: "334155" } };
        labelCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E2E8F0" },
        };
        labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

        days.forEach((day, index) => {
            const cell = row.getCell(index + 2);
            const key = isoDateFromDate(day);
            const insideTargetMonth = isSameTargetMonth(day, targetYear, targetMonth);
            cell.value = allDayByDate.get(key)?.[offset] || "";
            cell.alignment = { vertical: "top", wrapText: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: insideTargetMonth ? "F8FAFC" : "E5E7EB" },
            };
            cell.border = {
                top: { style: "thin", color: { argb: "CBD5E1" } },
                left: { style: "thin", color: { argb: "CBD5E1" } },
                bottom: { style: "thin", color: { argb: "CBD5E1" } },
                right: { style: "thin", color: { argb: "CBD5E1" } },
            };
        });
    }

    const firstHourRow = 5 + maxAllDayRows;
    for (let hour = 0; hour < 24; hour += 1) {
        const rowNumber = firstHourRow + hour;
        const row = sheet.getRow(rowNumber);
        row.height = 50;

        const hourCell = row.getCell(1);
        hourCell.value = `${String(hour).padStart(2, "0")}:00`;
        hourCell.font = { bold: true, color: { argb: "334155" } };
        hourCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E2E8F0" },
        };
        hourCell.alignment = { horizontal: "center", vertical: "middle" };
        hourCell.border = {
            top: { style: "thin", color: { argb: "CBD5E1" } },
            left: { style: "thin", color: { argb: "CBD5E1" } },
            bottom: { style: "thin", color: { argb: "CBD5E1" } },
            right: { style: "thin", color: { argb: "CBD5E1" } },
        };

        days.forEach((day, index) => {
            const cell = row.getCell(index + 2);
            const key = isoDateFromDate(day);
            const insideTargetMonth = isSameTargetMonth(day, targetYear, targetMonth);
            const items = timedByDateHour.get(`${key}-${hour}`) || [];
            cell.value = items.join("\n\n");
            cell.alignment = { vertical: "top", wrapText: true };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: insideTargetMonth
                        ? hour % 2 === 0
                            ? "FFFFFF"
                            : "F8FAFC"
                        : "E5E7EB",
                },
            };
            cell.border = {
                top: { style: "thin", color: { argb: "CBD5E1" } },
                left: { style: "thin", color: { argb: "CBD5E1" } },
                bottom: { style: "thin", color: { argb: "CBD5E1" } },
                right: { style: "thin", color: { argb: "CBD5E1" } },
            };
        });
    }

    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];
    sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: false,
        horizontalCentered: false,
        verticalCentered: false,
    };
}

async function fetchCalendarContent(icsUrl: string) {
    const response = await fetch(icsUrl, { cache: "no-store" });

    if (!response.ok) {
        throw new Error(
            `Falha ao acessar o calend\u00e1rio publicado: ${response.status} ${response.statusText}`
        );
    }

    return response.text();
}

function getMonthScopeOccurrences(icsContent: string, year: number, month: number) {
    const currentMonth = extractMonthlyOccurrences(icsContent, { year, month });
    const previousMonthDate = new Date(year, month - 2, 1);
    const nextMonthDate = new Date(year, month, 1);

    const previousMonth = extractMonthlyOccurrences(icsContent, {
        year: previousMonthDate.getFullYear(),
        month: previousMonthDate.getMonth() + 1,
    });
    const nextMonth = extractMonthlyOccurrences(icsContent, {
        year: nextMonthDate.getFullYear(),
        month: nextMonthDate.getMonth() + 1,
    });

    return dedupeOccurrences([...previousMonth, ...currentMonth, ...nextMonth]);
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const calendarId = searchParams.get("calendar") || "cmv-bh";
        const month = parseMonth(searchParams.get("month"));
        const scope = searchParams.get("scope") === "year" ? "year" : "month";

        if (!month) {
            return NextResponse.json(
                { error: "M\u00eas inv\u00e1lido. Use o formato YYYY-MM." },
                { status: 400 }
            );
        }

        const calendar = getCommunityCalendarConfig(calendarId);
        if (!calendar) {
            return NextResponse.json(
                { error: "Calend\u00e1rio n\u00e3o configurado." },
                { status: 404 }
            );
        }

        const icsUrl = resolvePublishedCalendarIcsUrl(calendar.sourceUrl);
        const icsContent = await fetchCalendarContent(icsUrl);
        const workbook = new ExcelJS.Workbook();

        if (scope === "year") {
            for (let monthNumber = 1; monthNumber <= 12; monthNumber += 1) {
                const occurrences = extractMonthlyOccurrences(icsContent, {
                    year: month.year,
                    month: monthNumber,
                });
                const sheet = workbook.addWorksheet(monthSheetLabel(month.year, monthNumber));
                createMonthlyGrid(sheet, occurrences, month.year, monthNumber, calendar.label);
            }
        } else {
            const weekRanges = createWeekRangesForMonth(month.year, month.month);
            const occurrences = getMonthScopeOccurrences(icsContent, month.year, month.month);

            weekRanges.forEach((weekRange) => {
                const sheet = workbook.addWorksheet(
                    weekSheetLabel(weekRange.index, weekRange.start, weekRange.end)
                );
                createWeeklyGrid(
                    sheet,
                    occurrences,
                    weekRange,
                    month.year,
                    month.month,
                    calendar.label
                );
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName =
            scope === "year"
                ? `calendario-anual-${calendar.id}-${month.year}.xlsx`
                : `calendario-semanal-${calendar.id}-${month.label}.xlsx`;

        return new NextResponse(buffer, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("ERRO EXPORTAR CALENDARIO EXCEL:", error);
        return NextResponse.json(
            { error: "Erro ao exportar calend\u00e1rio em Excel", details: String(error) },
            { status: 500 }
        );
    }
}
