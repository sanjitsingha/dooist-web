/** The public site's details. Public pages will live on dooist.in and the app on app.dooist.in. */
export const SITE = {
  name: "Dooist",
  domain: "dooist.in",
  url: "https://dooist.in",
  appDomain: "app.dooist.in",
  contactEmail: "contact@dooist.in",
} as const;

/** On this site until the domains are live. After that, the app should link to dooist.in. */
export const PRIVACY_PATH = "/privacy";
