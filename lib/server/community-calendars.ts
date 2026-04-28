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

export function resolvePublishedCalendarIcsUrl(sourceUrl: string) {
    if (sourceUrl.includes(".ics")) return sourceUrl;
    return sourceUrl.replace(/calendar\.html(?=($|[?#]))/, "calendar.ics");
}
