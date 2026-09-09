// Mirrors functions/src/email-layout.ts — kept as a duplicate (not a
// shared package) since apps/web and functions/ are separate deployments,
// but the markup must stay byte-identical so every Resend email THE DROP
// sends looks the same regardless of which app triggered it.
export const LOGO_URL = "https://copdrop.io/assets/landing/drop_logo.svg";

export const getEmailLayout = (content: string, title: string = "Own The Hype.") => `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 60px 20px; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto;">
      <img src="${LOGO_URL}" alt="THE DROP" style="width: 80px; height: 80px; margin-bottom: 20px;" />
      <h1 style="font-size: 48px; font-weight: 900; margin-bottom: 10px; letter-spacing: -2px; color: #ffffff;">${title}</h1>
      <div style="width: 50px; height: 4px; background: linear-gradient(90deg, #A855F7, #EC4899, #F97316); margin: 0 auto 30px;"></div>

      ${content}

      <p style="margin-top: 60px; font-size: 12px; color: #666666;">
        © 2026 THE DROP. • Accra, Ghana
      </p>
    </div>
  </div>
`;

export const emailButton = (href: string, label: string) => `
  <a href="${href}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px;">
    ${label}
  </a>
`;
