export const runtime = "nodejs";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { extractMonthlyOccurrences, type CalendarOccurrence } from "@/lib/server/calendar/ics";
import {
    getCommunityCalendarConfig,
    resolveCalendarSourceUrl,
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

type WeeklyAgendaEntry = {
    occurrence: CalendarOccurrence;
    startIndex: number;
    endIndex: number;
    label: string;
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

function differenceInCalendarDays(start: Date, end: Date) {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endUtc - startUtc) / 86_400_000);
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

function agendaWeekSheetLabel(index: number, start: Date, end: Date) {
    const startLabel = `${String(start.getDate()).padStart(2, "0")}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const endLabel = `${String(end.getDate()).padStart(2, "0")}-${String(end.getMonth() + 1).padStart(2, "0")}`;
    return `Agenda ${index} ${startLabel}-${endLabel}`;
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

function formatDayLabel(date: Date) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function dateFromOccurrenceDate(value: string) {
    const parts = parseOccurrenceDate(value);
    if (!parts) return null;
    return new Date(parts.year, parts.month - 1, parts.day);
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

function getOccurrenceDateSpan(occurrence: CalendarOccurrence) {
    const start = dateFromOccurrenceDate(occurrence.startDate);
    const rawEnd = dateFromOccurrenceDate(occurrence.endDate);

    if (!start || !rawEnd) return null;

    let inclusiveEnd = new Date(rawEnd.getTime());
    if (occurrence.allDay || (occurrence.endTime === "00:00" && rawEnd.getTime() > start.getTime())) {
        inclusiveEnd = addDays(inclusiveEnd, -1);
    }

    if (inclusiveEnd.getTime() < start.getTime()) {
        inclusiveEnd = new Date(start.getTime());
    }

    return { start, inclusiveEnd };
}

function buildAgendaEntryLabel(
    occurrence: CalendarOccurrence,
    startDate: Date,
    endDate: Date
) {
    const sameDay = startDate.getTime() === endDate.getTime();
    const lines: string[] = [];

    if (occurrence.allDay) {
        lines.push(occurrence.summary);
        lines.push(
            sameDay
                ? `Dia inteiro · ${formatDayLabel(startDate)}`
                : `${formatDayLabel(startDate)} a ${formatDayLabel(endDate)} · Dia inteiro`
        );
    } else {
        lines.push(`${occurrence.startTime}\u2013${occurrence.endTime} · ${occurrence.summary}`);
        if (!sameDay) {
            lines.push(
                `${formatDayLabel(startDate)} ${occurrence.startTime} \u2192 ${formatDayLabel(endDate)} ${occurrence.endTime}`
            );
        }
    }

    if (occurrence.location && occurrence.location !== "-") {
        lines.push(occurrence.location);
    }

    return lines.join("\n");
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

function createWeeklyAgendaGrid(
    sheet: ExcelJS.Worksheet,
    occurrences: CalendarOccurrence[],
    weekRange: WeekRange,
    targetYear: number,
    targetMonth: number,
    calendarLabel: string
) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekRange.start, index));
    const totalColumns = 8;
    const lastColumn = excelColumnName(totalColumns);
    const agendaEntries: WeeklyAgendaEntry[] = [];

    occurrences.forEach((occurrence) => {
        const span = getOccurrenceDateSpan(occurrence);
        if (!span) return;
        if (span.inclusiveEnd < weekRange.start || span.start > weekRange.end) return;

        const clippedStart = span.start < weekRange.start ? weekRange.start : span.start;
        const clippedEnd = span.inclusiveEnd > weekRange.end ? weekRange.end : span.inclusiveEnd;

        agendaEntries.push({
            occurrence,
            startIndex: differenceInCalendarDays(weekRange.start, clippedStart),
            endIndex: differenceInCalendarDays(weekRange.start, clippedEnd),
            label: buildAgendaEntryLabel(occurrence, span.start, span.inclusiveEnd),
        });
    });

    agendaEntries.sort((left, right) => {
        const byStart = left.occurrence.startSortKey.localeCompare(right.occurrence.startSortKey);
        if (byStart !== 0) return byStart;
        const leftSpan = left.endIndex - left.startIndex;
        const rightSpan = right.endIndex - right.startIndex;
        if (leftSpan !== rightSpan) return rightSpan - leftSpan;
        return left.occurrence.summary.localeCompare(right.occurrence.summary);
    });

    const lanes: WeeklyAgendaEntry[][] = [];
    const occupancy: boolean[][] = [];

    agendaEntries.forEach((entry) => {
        let laneIndex = occupancy.findIndex((lane) =>
            lane.slice(entry.startIndex, entry.endIndex + 1).every((taken) => !taken)
        );

        if (laneIndex === -1) {
            laneIndex = occupancy.length;
            occupancy.push(Array.from({ length: 7 }, () => false));
            lanes.push([]);
        }

        for (let index = entry.startIndex; index <= entry.endIndex; index += 1) {
            occupancy[laneIndex][index] = true;
        }
        lanes[laneIndex].push(entry);
    });

    sheet.columns = [
        { key: "slot", width: 15 },
        ...Array.from({ length: 7 }, () => ({ width: 22 })),
    ];

    sheet.mergeCells(`A1:${lastColumn}1`);
    sheet.getCell("A1").value = `Agenda semanal de ${calendarLabel}`;
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
        `Semana ${weekRange.index} · ${formatWeekRangeLabel(weekRange.start, weekRange.end)} · compromissos em linhas, sem divisão por hora`;
    sheet.getCell("A2").font = { italic: true, color: { argb: "475569" } };
    sheet.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };

    const headerRow = sheet.getRow(4);
    headerRow.getCell(1).value = "Compromissos";
    headerRow.getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0F172A" },
    };
    headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

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

    if (lanes.length === 0) {
        const row = sheet.getRow(5);
        row.height = 42;
        row.getCell(1).value = "Sem agenda";
        row.getCell(1).font = { bold: true, color: { argb: "334155" } };
        row.getCell(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "E2E8F0" },
        };
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

        sheet.mergeCells("B5:H5");
        const messageCell = sheet.getCell("B5");
        messageCell.value = "Nenhum compromisso nesta semana.";
        messageCell.alignment = { horizontal: "center", vertical: "middle" };
        messageCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F8FAFC" },
        };
        messageCell.font = { italic: true, color: { argb: "475569" } };
        messageCell.border = {
            top: { style: "thin", color: { argb: "CBD5E1" } },
            left: { style: "thin", color: { argb: "CBD5E1" } },
            bottom: { style: "thin", color: { argb: "CBD5E1" } },
            right: { style: "thin", color: { argb: "CBD5E1" } },
        };
    } else {
        lanes.forEach((lane, laneIndex) => {
            const rowNumber = 5 + laneIndex;
            const row = sheet.getRow(rowNumber);
            row.height = 56;

            const labelCell = row.getCell(1);
            labelCell.value = `Comp. ${laneIndex + 1}`;
            labelCell.font = { bold: true, color: { argb: "334155" } };
            labelCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "E2E8F0" },
            };
            labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            labelCell.border = {
                top: { style: "thin", color: { argb: "CBD5E1" } },
                left: { style: "thin", color: { argb: "CBD5E1" } },
                bottom: { style: "thin", color: { argb: "CBD5E1" } },
                right: { style: "thin", color: { argb: "CBD5E1" } },
            };

            days.forEach((day, dayIndex) => {
                const cell = row.getCell(dayIndex + 2);
                const insideTargetMonth = isSameTargetMonth(day, targetYear, targetMonth);
                cell.value = "";
                cell.alignment = { vertical: "top", wrapText: true };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: insideTargetMonth ? "FFFFFF" : "E5E7EB" },
                };
                cell.border = {
                    top: { style: "thin", color: { argb: "CBD5E1" } },
                    left: { style: "thin", color: { argb: "CBD5E1" } },
                    bottom: { style: "thin", color: { argb: "CBD5E1" } },
                    right: { style: "thin", color: { argb: "CBD5E1" } },
                };
            });

            lane.forEach((entry) => {
                const startColumn = entry.startIndex + 2;
                const endColumn = entry.endIndex + 2;

                if (endColumn > startColumn) {
                    sheet.mergeCells(rowNumber, startColumn, rowNumber, endColumn);
                }

                const eventCell = row.getCell(startColumn);
                eventCell.value = entry.label;
                eventCell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
                eventCell.font = {
                    color: { argb: entry.occurrence.allDay ? "FFFFFF" : "0F172A" },
                    bold: true,
                };
                eventCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: entry.occurrence.allDay
                            ? "2563EB"
                            : entry.endIndex > entry.startIndex
                              ? "BFDBFE"
                              : "DBEAFE",
                    },
                };
                eventCell.border = {
                    top: { style: "thin", color: { argb: "93C5FD" } },
                    left: { style: "thin", color: { argb: "93C5FD" } },
                    bottom: { style: "thin", color: { argb: "93C5FD" } },
                    right: { style: "thin", color: { argb: "93C5FD" } },
                };
            });
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
        const rawScope = searchParams.get("scope");
        const scope = rawScope === "year" || rawScope === "agenda" ? rawScope : "month";
        const sourceUrlOverride = searchParams.get("sourceUrl");

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

        let sourceUrl = "";
        try {
            sourceUrl = resolveCalendarSourceUrl(calendarId, sourceUrlOverride);
        } catch (error) {
            if (error instanceof Error && error.message === "LINK_CALENDARIO_INVALIDO") {
                return NextResponse.json(
                    {
                        error: "Link do calend\u00e1rio inv\u00e1lido.",
                        details: "Use um link publicado do Outlook em https://outlook.office365.com/...",
                    },
                    { status: 400 }
                );
            }
            throw error;
        }

        const icsUrl = resolvePublishedCalendarIcsUrl(sourceUrl);
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
        } else if (scope === "agenda") {
            const weekRanges = createWeekRangesForMonth(month.year, month.month);
            const occurrences = getMonthScopeOccurrences(icsContent, month.year, month.month);

            weekRanges.forEach((weekRange) => {
                const sheet = workbook.addWorksheet(
                    agendaWeekSheetLabel(weekRange.index, weekRange.start, weekRange.end)
                );
                createWeeklyAgendaGrid(
                    sheet,
                    occurrences,
                    weekRange,
                    month.year,
                    month.month,
                    calendar.label
                );
            });
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
                : scope === "agenda"
                  ? `calendario-agenda-${calendar.id}-${month.label}.xlsx`
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
