import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esMember from './locales/es/member.json';
import esWorkouts from './locales/es/workouts.json';
import esTemplates from './locales/es/templates.json';
import esExercises from './locales/es/exercises.json';
import esProfile from './locales/es/profile.json';
import esSession from './locales/es/session.json';
import esClients from './locales/es/clients.json';
import esRoutines from './locales/es/routines.json';
import esApp from './locales/es/app.json';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enMember from './locales/en/member.json';
import enWorkouts from './locales/en/workouts.json';
import enTemplates from './locales/en/templates.json';
import enExercises from './locales/en/exercises.json';
import enProfile from './locales/en/profile.json';
import enSession from './locales/en/session.json';
import enClients from './locales/en/clients.json';
import enRoutines from './locales/en/routines.json';
import enApp from './locales/en/app.json';
import { deviceLanguage } from './language.store';

/**
 * The namespaces shared with the web app keep its file names and keys, seeded
 * from bloomboard-frontend's locales, so a string ported with a component
 * needs no renaming. `app` holds what only the mobile app says. Spanish is
 * primary; `npm run check:i18n` keeps es and en in step.
 */
export const NAMESPACES = [
  'common',
  'auth',
  'member',
  'workouts',
  'templates',
  'exercises',
  'profile',
  'session',
  'clients',
  'routines',
  'app',
] as const;

export const resources = {
  es: {
    common: esCommon,
    auth: esAuth,
    member: esMember,
    workouts: esWorkouts,
    templates: esTemplates,
    exercises: esExercises,
    profile: esProfile,
    session: esSession,
    clients: esClients,
    routines: esRoutines,
    app: esApp,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    member: enMember,
    workouts: enWorkouts,
    templates: enTemplates,
    exercises: enExercises,
    profile: enProfile,
    session: enSession,
    clients: enClients,
    routines: enRoutines,
    app: enApp,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  // The stored choice is applied once it has loaded (I18nGate).
  lng: deviceLanguage(),
  fallbackLng: 'es',
  ns: [...NAMESPACES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
