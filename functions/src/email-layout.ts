// Single source of truth for THE DROP's transactional-email look — every
// Resend email in this codebase should be wrapped with getEmailLayout()
// rather than defining its own one-off style, so all vendor/customer
// emails stay visually consistent (was previously drifting: onboarding
// emails used this branded black style, but the complaint and password
// reset emails each had their own unrelated light-card look).
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

// Shared building blocks used across templates, so button/callout styling
// stays identical everywhere instead of being retyped per email.
export const emailButton = (href: string, label: string) => `
  <a href="${href}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px;">
    ${label}
  </a>
`;

export const emailCallout = (heading: string, body: string, accent: string = "#333") => `
  <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; margin-bottom: 40px; text-align: left; border: 1px solid ${accent};">
    <h3 style="margin-top: 0; margin-bottom: 15px; color: #ffffff;">${heading}</h3>
    <div style="color: #ccc;">${body}</div>
  </div>
`;
