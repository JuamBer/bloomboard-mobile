/** Where Bloom Board lives outside the app — Ajustes › Sobre Bloom Board. */
export const BLOOM_LINKS = {
  web: 'https://bloomboard.pro/',
  email: 'contacto@bloomfitness.es',
  privacy: {
    es: 'https://bloomboard.pro/privacy',
    en: 'https://bloomboard.pro/en/privacy',
  },
  instagram: 'https://www.instagram.com/bloomboard.pro/',
  facebook: 'https://www.facebook.com/profile.php?id=61590645104069',
  linkedin: 'https://www.linkedin.com/company/bloomboardpro/',
} as const;

/** The privacy policy in the app's language. */
export const privacyUrl = (language: string) =>
  language === 'en' ? BLOOM_LINKS.privacy.en : BLOOM_LINKS.privacy.es;
