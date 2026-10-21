import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email || "whotf.sufii@gmail.com";
    const userAgent = request.headers.get("user-agent") || "Unknown Device / Browser";
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const clientIp = forwardedFor.split(",")[0].trim();

    const now = new Date();
    const utcString = now.toUTCString();
    const pktString = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      dateStyle: "full",
      timeStyle: "medium",
    }).format(now);

    const emailSubject = "Security Alert: OmniSync Admin Login Detected";
    const emailText = `Hello Sufii,

Your OmniSync Admin dashboard was just accessed.
- Time: ${pktString} (${utcString})
- Email: ${targetEmail}
- Device: ${userAgent}
- IP Address: ${clientIp}

If this was you, no action is needed. If you did not initiate this login, please secure your account immediately.

— OmniSync Security Sentinel`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
          <div style="background-color: #0f172a; color: #ffffff; width: 36px; height: 36px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; text-align: center; line-height: 36px;">
            🛡️
          </div>
          <span style="font-size: 18px; font-weight: 700; color: #0f172a; margin-left: 8px;">OmniSync Security Alert</span>
        </div>

        <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">Hello <strong>Sufii</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          Your <strong>OmniSync Admin dashboard</strong> was just accessed with Owner credentials.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 100px;"><strong>Timestamp:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${pktString}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Admin Email:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${targetEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Client IP:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${clientIp}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; vertical-align: top;"><strong>User Agent:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 11px; word-break: break-all;">${userAgent}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
          If this was you, no action is needed.
        </p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This is an automated operational security notification dispatched from OmniSync Platform.
        </p>
      </div>
    `;

    let delivered = false;
    let providerUsed = "none";

    // 1. Try Resend if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.RESEND_FROM_EMAIL || "OmniSync Security <onboarding@resend.dev>";
        await resend.emails.send({
          from: fromEmail,
          to: "whotf.sufii@gmail.com",
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
        delivered = true;
        providerUsed = "resend";
      } catch (err) {
        console.warn("[notify-login] Resend dispatch attempt error:", err);
      }
    }

    // 2. Try Nodemailer / Gmail SMTP if configured
    if (!delivered && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"OmniSync Security" <${process.env.SMTP_EMAIL}>`,
          to: "whotf.sufii@gmail.com",
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
        delivered = true;
        providerUsed = "nodemailer-smtp";
      } catch (err) {
        console.warn("[notify-login] Nodemailer dispatch attempt error:", err);
      }
    }

    console.log(`[notify-login] Admin login notification processed (delivered: ${delivered}, provider: ${providerUsed}) for ${targetEmail}`);

    return NextResponse.json({
      success: true,
      delivered,
      provider: providerUsed,
      recipient: "whotf.sufii@gmail.com",
      timestamp: pktString,
    });
  } catch (error) {
    console.error("[POST /api/auth/notify-login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}
