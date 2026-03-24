export const SESSION_COOKIE = "cmv_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type AppSession = {
    email: string;
    name: string;
    role: "ADMIN" | "COORDENADOR" | "EQUIPE" | "LEITOR";
};

type SessionPayload = AppSession & {
    exp: number;
};

type SignedPayload = {
    exp: number;
};

function getAuthSecret() {
    return new TextEncoder().encode(
        process.env.AUTH_SECRET || "troque-esta-chave-em-desenvolvimento"
    );
}

function toBase64Url(value: Uint8Array) {
    let binary = "";
    value.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = padded + "=".repeat((4 - (padded.length % 4 || 4)) % 4);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

async function signValue(value: string) {
    const key = await crypto.subtle.importKey(
        "raw",
        getAuthSecret(),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return toBase64Url(new Uint8Array(signature));
}

async function verifyValue(value: string, signature: string) {
    const expected = await signValue(value);
    return expected === signature;
}

export async function signPayload<T extends SignedPayload>(payload: T) {
    const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    const signature = await signValue(encodedPayload);
    return `${encodedPayload}.${signature}`;
}

export async function verifySignedPayload<T extends SignedPayload>(token: string) {
    const [payloadPart, signature] = token.split(".");
    if (!payloadPart || !signature) {
        throw new Error("Token invalido");
    }

    const isValid = await verifyValue(payloadPart, signature);
    if (!isValid) {
        throw new Error("Assinatura invalida");
    }

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as T;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Sessao expirada");
    }

    return payload;
}

export async function createSessionToken(session: AppSession) {
    return signPayload<SessionPayload>({
        ...session,
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    });
}

export async function verifySessionToken(token: string) {
    const payload = await verifySignedPayload<SessionPayload>(token);
    return {
        email: payload.email,
        name: payload.name,
        role: payload.role,
    } satisfies AppSession;
}
