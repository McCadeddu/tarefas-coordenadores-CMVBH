export function formatDateForInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function normalizeDateInput(value?: string | Date | null) {
    if (!value) return "";

    if (typeof value === "string") {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "";
        return formatDateForInput(parsed);
    }

    if (Number.isNaN(value.getTime())) return "";
    return formatDateForInput(value);
}

export function formatDateForDisplay(value?: string | Date | null, locale = "pt-BR") {
    if (!value) return "—";

    const normalized = typeof value === "string" ? normalizeDateInput(value) : formatDateForInput(value);
    if (!normalized) return "—";

    const [year, month, day] = normalized.split("-").map(Number);
    const parsed = new Date(year, (month || 1) - 1, day || 1);
    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
