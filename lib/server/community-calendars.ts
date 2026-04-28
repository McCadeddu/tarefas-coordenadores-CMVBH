import { COMMUNITY_CALENDAR_OPTIONS } from "@/lib/shared/app-config";

type CommunityCalendarConfig = {
    id: string;
    label: string;
    sourceUrl: string;
};

const DEFAULT_CMV_BH_CALENDAR_URL =
    "https://outlook.office365.com/owa/calendar/27e42cdf35fb4faea44a802a3009d7e0@villaregia.org/c5ca23ad59724db6b2546ef12f35ba3f10337244021851821269/calendar.html";

const COMMUNITY_CALENDARS: CommunityCalendarConfig[] = COMMUNITY_CALENDAR_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
    sourceUrl:
        option.id === "cmv-bh"
            ? process.env.CMV_BH_CALENDAR_URL || DEFAULT_CMV_BH_CALENDAR_URL
            : "",
}));

export function getCommunityCalendarConfig(id: string) {
    return COMMUNITY_CALENDARS.find((calendar) => calendar.id === id) || null;
}

export function normalizePublishedCalendarUrl(sourceUrl: string) {
    const trimmed = sourceUrl.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("webcal://")) {
        return `https://${trimmed.slice("webcal://".length)}`;
    }

    return trimmed;
}

export function isSupportedPublishedCalendarUrl(sourceUrl: string) {
    try {
        const normalized = normalizePublishedCalendarUrl(sourceUrl);
        const url = new URL(normalized);
        const allowedHosts = ["outlook.office365.com", "outlook.office.com"];

        return url.protocol === "https:" && allowedHosts.includes(url.hostname);
    } catch {
        return false;
    }
}

export function resolveCalendarSourceUrl(calendarId: string, overrideUrl?: string | null) {
    if (overrideUrl) {
        const normalized = normalizePublishedCalendarUrl(overrideUrl);
        if (!isSupportedPublishedCalendarUrl(normalized)) {
            throw new Error("LINK_CALENDARIO_INVALIDO");
        }
        return normalized;
    }

    const config = getCommunityCalendarConfig(calendarId);
    return config?.sourceUrl || "";
}

export function resolvePublishedCalendarIcsUrl(sourceUrl: string) {
    const normalized = normalizePublishedCalendarUrl(sourceUrl);
    if (normalized.includes(".ics")) return normalized;
    return normalized.replace(/calendar\.html(?=($|[?#]))/, "calendar.ics");
}
