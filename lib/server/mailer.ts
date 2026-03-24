import nodemailer from "nodemailer";

type SendMailResult = {
    delivered: boolean;
    previewCode?: string;
};

function getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "587");
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;

    if (!host || !user || !password) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass: password,
        },
    });
}

export async function sendVerificationEmail(email: string, code: string): Promise<SendMailResult> {
    const transporter = getTransporter();

    if (!transporter) {
        console.log(`[auth] Codigo de acesso para ${email}: ${code}`);
        return {
            delivered: false,
            previewCode: process.env.NODE_ENV === "production" ? undefined : code,
        };
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@villaregia.org",
        to: email,
        subject: "Codigo de acesso ao programa",
        text: `Seu codigo de acesso e: ${code}. Ele expira em 15 minutos.`,
        html: `<p>Seu codigo de acesso e:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p><p>Ele expira em 15 minutos.</p>`,
    });

    return { delivered: true };
}
