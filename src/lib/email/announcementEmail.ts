const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.daleel.site");

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAnnouncementEmailHtml({
  icon,
  title,
  description,
  ctaLabel,
  ctaUrl,
  isAr,
}: {
  icon: string;
  title: string;
  description: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isAr: boolean;
}): string {
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";
  const hasCta = !!ctaLabel && !!ctaUrl;
  const absoluteCtaUrl = hasCta ? new URL(ctaUrl!, BASE_URL).toString() : null;

  const ctaBlock = hasCta
    ? `<tr><td style="padding: 8px 32px 32px;" align="center">
         <a href="${absoluteCtaUrl}" style="display:inline-block; background:#429874; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; padding:12px 28px; border-radius:8px;">
           ${escapeHtml(ctaLabel!)}
         </a>
       </td></tr>`
    : "";

  const footerText = isAr
    ? "بتستلم الإيميل ده لأنك مسجل في منصة دليل. تقدر توقف الإشعارات عبر الإيميل من إعدادات حسابك."
    : "You're receiving this because you have a Daleel account. You can turn off email notifications anytime from your account settings.";

  return `<!doctype html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f6f5; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg, #285c46, #429874); padding:32px; text-align:${align};" dir="${dir}">
                <div style="width:56px; height:56px; border-radius:9999px; background:rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; font-size:28px; line-height:56px; text-align:center;">${icon}</div>
                <h1 style="margin:16px 0 0; color:#ffffff; font-size:20px; font-weight:700;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px; text-align:${align};" dir="${dir}">
                <p style="margin:0; color:#334155; font-size:15px; line-height:1.6; white-space:pre-wrap;">${escapeHtml(description)}</p>
              </td>
            </tr>
            ${ctaBlock}
            <tr>
              <td style="padding:16px 32px 28px; border-top:1px solid #f1f5f9; text-align:${align};" dir="${dir}">
                <p style="margin:16px 0 0; color:#94a3b8; font-size:12px; line-height:1.5;">${footerText}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
