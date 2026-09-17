/**
 * Datos públicos de la organización. Alimentan el footer y el schema
 * `Organization`: un link que no está acá no aparece en ninguno de los dos.
 */

export type SocialNetwork = "linkedin" | "instagram" | "facebook" | "twitter" | "youtube";

// TODO(owner): completar las URLs reales. Las vacías no se renderizan ni van a `sameAs`.
const SOCIAL_LINKS: Record<SocialNetwork, string> = {
  linkedin: "",
  instagram: "",
  facebook: "",
  twitter: "",
  youtube: "",
};

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  youtube: "YouTube",
};

export function activeSocialLinks(): { network: SocialNetwork; url: string }[] {
  return (Object.entries(SOCIAL_LINKS) as [SocialNetwork, string][])
    .filter(([, url]) => url.trim() !== "")
    .map(([network, url]) => ({ network, url }));
}

export const CONTACT_EMAILS = {
  soporte: "soporte@vinciinventa.com",
  privacidad: "privacidad@vinciinventa.com",
  legal: "legal@vinciinventa.com",
};

export const PARENT_ORGANIZATION = {
  name: "Digital Axios",
  url: "https://digitalaxios.com",
};
