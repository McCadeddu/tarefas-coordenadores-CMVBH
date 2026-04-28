type DateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    allDay: boolean;
};

type ParsedProperty = {
    name: string;
    params: Record<string, string>;
    value: string;
};

type RawEvent = {
    uid: string | null;
    summary: string;
    location: string;
    description: string;
    status: string;
    dtstart: { parts: DateParts; params: Record<string, string> } | null;
    dtend: { parts: DateParts; params: Record<string, string> } | null;
    rrule: string | null;
    exdates: DateParts[];
    recurrenceId: DateParts | null;
};

export type CalendarOccurrence = {
    summary: string;
    location: string;
    description: string;
    allDay: boolean;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    startSortKey: string;
};

type MonthTarget = {
    year: number;
    month: number;
};

function unfoldIcsLines(content: string) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const unfolded: string[] = [];

    for (const line of lines) {
        if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
            unfolded[unfolded.length - 1] += line.slice(1);
            continue;
        }
        unfolded.push(line);
    }

    return unfolded;
}

function unescapeIcsText(value: string) {
    return value
        .replace(/\\n/gi, "\n")
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\\\/g, "\\")
        .trim();
}

function parseProperty(line: string): ParsedProperty | null {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return null;

    const left = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    const [rawName, ...rawParams] = left.split(";");
    const params: Record<string, string> = {};

    rawParams.forEach((param) => {
        const [key, paramValue = ""] = param.split("=");
        params[key.toUpperCase()] = paramValue;
    });

    return {
        name: rawName.toUpperCase(),
        params,
        value,
    };
}

function parseDateParts(value: string, params: Record<string, string>) {
    const normalized = value.trim();
    const isAllDay = params.VALUE === "DATE" || /^\d{8}$/.test(normalized);
    const compact = normalized.replace(/Z$/, "");

    if (isAllDay) {
        const year = Number(compact.slice(0, 4));
        const month = Number(compact.slice(4, 6));
        const day = Number(compact.slice(6, 8));
        if (!year || !month || !day) return null;

        return {
            year,
            month,
            day,
            hour: 0,
            minute: 0,
            second: 0,
            allDay: true,
        } satisfies DateParts;
    }

    const match = compact.match(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/
    );
    if (!match) return null;

    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6]),
        allDay: false,
    } satisfies DateParts;
}

function datePartsToUtcDate(parts: DateParts) {
    return new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    );
}

function datePartsKey(parts: DateParts) {
    return [
        parts.year,
        String(parts.month).padStart(2, "0"),
        String(parts.day).padStart(2, "0"),
    ].join("-") + (parts.allDay
        ? ""
        : `T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`);
}

function formatDateParts(parts: DateParts) {
    return [
        String(parts.day).padStart(2, "0"),
        String(parts.month).padStart(2, "0"),
        String(parts.year),
    ].join("/");
}

function formatTimeParts(parts: DateParts) {
    if (parts.allDay) return "Dia inteiro";
    return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function differenceInDays(start: Date, end: Date) {
    return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function differenceInWeeks(start: Date, end: Date) {
    return Math.floor(differenceInDays(start, end) / 7);
}

function differenceInMonths(start: Date, end: Date) {
    return (
        (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (end.getUTCMonth() - start.getUTCMonth())
    );
}

function differenceInYears(start: Date, end: Date) {
    return end.getUTCFullYear() - start.getUTCFullYear();
}

function addUtcDays(date: Date, amount: number) {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + amount);
    return copy;
}

function parseRRule(value: string | null) {
    if (!value) return null;
    return Object.fromEntries(
        value.split(";").map((part) => {
            const [key, ruleValue = ""] = part.split("=");
            return [key.toUpperCase(), ruleValue];
        })
    );
}

function weekdayCode(date: Date) {
    return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][date.getUTCDay()];
}

function weekdayCodeFromParts(parts: DateParts) {
    return weekdayCode(datePartsToUtcDate(parts));
}

function matchesRecurringDate(
    dayCursor: Date,
    startDay: Date,
    startParts: DateParts,
    rule: Record<string, string>
) {
    const frequency = rule.FREQ || "DAILY";
    const interval = Math.max(Number(rule.INTERVAL || 1), 1);
    const byDay = (rule.BYDAY || "")
        .split(",")
        .map((item) => item.trim().slice(-2))
        .filter(Boolean);
    const byMonthDay = (rule.BYMONTHDAY || "")
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item));

    if (frequency === "DAILY") {
        return differenceInDays(startDay, dayCursor) % interval === 0;
    }

    if (frequency === "WEEKLY") {
        const activeDays = byDay.length > 0 ? byDay : [weekdayCodeFromParts(startParts)];
        return (
            differenceInWeeks(startDay, dayCursor) % interval === 0 &&
            activeDays.includes(weekdayCode(dayCursor))
        );
    }

    if (frequency === "MONTHLY") {
        const monthsDiff = differenceInMonths(startDay, dayCursor);
        if (monthsDiff % interval !== 0) return false;
        if (byMonthDay.length > 0) {
            return byMonthDay.includes(dayCursor.getUTCDate());
        }
        return dayCursor.getUTCDate() === startParts.day;
    }

    if (frequency === "YEARLY") {
        const yearsDiff = differenceInYears(startDay, dayCursor);
        return (
            yearsDiff % interval === 0 &&
            dayCursor.getUTCMonth() + 1 === startParts.month &&
            dayCursor.getUTCDate() === startParts.day
        );
    }

    return false;
}

function computeDurationMs(event: RawEvent) {
    if (event.dtstart && event.dtend) {
        return Math.max(
            datePartsToUtcDate(event.dtend.parts).getTime() -
                datePartsToUtcDate(event.dtstart.parts).getTime(),
            event.dtstart.parts.allDay ? 86_400_000 : 3_600_000
        );
    }

    if (event.dtstart?.parts.allDay) return 86_400_000;
    return 3_600_000;
}

function overlapsMonth(start: Date, end: Date, monthStart: Date, monthEndExclusive: Date) {
    return start < monthEndExclusive && end > monthStart;
}

function buildOccurrence(
    event: RawEvent,
    startParts: DateParts,
    durationMs: number
): CalendarOccurrence {
    const startDate = datePartsToUtcDate(startParts);
    const endDate = new Date(startDate.getTime() + durationMs);
    const endParts: DateParts = {
        year: endDate.getUTCFullYear(),
        month: endDate.getUTCMonth() + 1,
        day: endDate.getUTCDate(),
        hour: endDate.getUTCHours(),
        minute: endDate.getUTCMinutes(),
        second: endDate.getUTCSeconds(),
        allDay: startParts.allDay,
    };

    return {
        summary: event.summary || "(Sem t\u00edtulo)",
        location: event.location || "-",
        description: event.description || "-",
        allDay: startParts.allDay,
        startDate: formatDateParts(startParts),
        endDate: formatDateParts(endParts),
        startTime: formatTimeParts(startParts),
        endTime: formatTimeParts(endParts),
        startSortKey: `${startParts.year}-${String(startParts.month).padStart(2, "0")}-${String(startParts.day).padStart(2, "0")}T${String(startParts.hour).padStart(2, "0")}:${String(startParts.minute).padStart(2, "0")}`,
    };
}

function parseEvents(icsContent: string) {
    const lines = unfoldIcsLines(icsContent);
    const events: RawEvent[] = [];
    let current: RawEvent | null = null;

    for (const line of lines) {
        if (line === "BEGIN:VEVENT") {
            current = {
                uid: null,
                summary: "",
                location: "",
                description: "",
                status: "",
                dtstart: null,
                dtend: null,
                rrule: null,
                exdates: [],
                recurrenceId: null,
            };
            continue;
        }

        if (line === "END:VEVENT") {
            if (current?.dtstart) {
                events.push(current);
            }
            current = null;
            continue;
        }

        if (!current) continue;

        const property = parseProperty(line);
        if (!property) continue;

        switch (property.name) {
            case "UID":
                current.uid = property.value.trim();
                break;
            case "SUMMARY":
                current.summary = unescapeIcsText(property.value);
                break;
            case "LOCATION":
                current.location = unescapeIcsText(property.value);
                break;
            case "DESCRIPTION":
                current.description = unescapeIcsText(property.value);
                break;
            case "STATUS":
                current.status = property.value.trim().toUpperCase();
                break;
            case "DTSTART": {
                const parts = parseDateParts(property.value, property.params);
                if (parts) current.dtstart = { parts, params: property.params };
                break;
            }
            case "DTEND": {
                const parts = parseDateParts(property.value, property.params);
                if (parts) current.dtend = { parts, params: property.params };
                break;
            }
            case "RRULE":
                current.rrule = property.value.trim();
                break;
            case "EXDATE": {
                property.value.split(",").forEach((value) => {
                    const parts = parseDateParts(value, property.params);
                    if (parts) current?.exdates.push(parts);
                });
                break;
            }
            case "RECURRENCE-ID": {
                const parts = parseDateParts(property.value, property.params);
                if (parts) current.recurrenceId = parts;
                break;
            }
            default:
                break;
        }
    }

    return events.filter((event) => event.status !== "CANCELLED");
}

export function extractMonthlyOccurrences(icsContent: string, target: MonthTarget) {
    const monthStart = new Date(Date.UTC(target.year, target.month - 1, 1, 0, 0, 0));
    const monthEndExclusive = new Date(Date.UTC(target.year, target.month, 1, 0, 0, 0));
    const events = parseEvents(icsContent);
    const occurrences: CalendarOccurrence[] = [];

    events.forEach((event) => {
        if (!event.dtstart) return;

        const durationMs = computeDurationMs(event);
        const startDate = datePartsToUtcDate(event.dtstart.parts);
        const endDate = new Date(startDate.getTime() + durationMs);

        if (!event.rrule || event.recurrenceId) {
            if (overlapsMonth(startDate, endDate, monthStart, monthEndExclusive)) {
                occurrences.push(buildOccurrence(event, event.dtstart.parts, durationMs));
            }
            return;
        }

        const rule = parseRRule(event.rrule);
        if (!rule) return;

        const untilParts = rule.UNTIL ? parseDateParts(rule.UNTIL, event.dtstart.params) : null;
        const untilDate = untilParts ? datePartsToUtcDate(untilParts) : null;
        const countLimit = rule.COUNT ? Number(rule.COUNT) : null;
        const excluded = new Set(event.exdates.map(datePartsKey));
        const startDay = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
        let cursor = new Date(startDay.getTime());
        let generatedCount = 0;

        while (cursor < monthEndExclusive) {
            if (untilDate && cursor > untilDate) break;

            if (matchesRecurringDate(cursor, startDay, event.dtstart.parts, rule)) {
                generatedCount += 1;

                const occurrenceParts: DateParts = {
                    ...event.dtstart.parts,
                    year: cursor.getUTCFullYear(),
                    month: cursor.getUTCMonth() + 1,
                    day: cursor.getUTCDate(),
                };

                if (!excluded.has(datePartsKey(occurrenceParts))) {
                    const occurrenceStart = datePartsToUtcDate(occurrenceParts);
                    const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
                    if (overlapsMonth(occurrenceStart, occurrenceEnd, monthStart, monthEndExclusive)) {
                        occurrences.push(buildOccurrence(event, occurrenceParts, durationMs));
                    }
                }

                if (countLimit && generatedCount >= countLimit) break;
            }

            cursor = addUtcDays(cursor, 1);
        }
    });

    return occurrences.sort((a, b) => a.startSortKey.localeCompare(b.startSortKey));
}
