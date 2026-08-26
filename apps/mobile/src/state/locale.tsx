/**
 * Language.
 *
 * English, French, Spanish for now. UI strings live in the dictionary below;
 * `t(key)` returns the current language, falling back to English, then the key
 * itself. The chosen language is remembered across launches.
 *
 * Note: this translates the app's *chrome*. Scripture text depends on which
 * Bible translation is loaded (FR/ES translations are a data import), and AI
 * explanations follow the language only when a real, language-aware AI provider
 * is configured — the offline mock is English.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as storage from '@/state/storage';

export type Locale = 'en' | 'fr' | 'es' | 'ht';
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ht', label: 'Kreyòl' },
];

const KEY = 'selah.locale';

type Dict = Record<string, string>;

const STRINGS: Record<Locale, Dict> = {
  en: {
    'nav.today': 'Today',
    'nav.reader': 'Reader',
    'nav.study': 'Study',
    'nav.notes': 'Notes',
    'nav.you': 'You',
    'nav.library': 'Library',
    'nav.account': 'Account',
    'brand.tagline': 'Bible Study',
    'today.morning': 'Good morning',
    'today.afternoon': 'Good afternoon',
    'today.evening': 'Good evening',
    'today.subtitle': 'Take a moment with one verse.',
    'today.reflect': 'Reflect on this verse',
    'today.openReader': 'Open the Reader',
    'today.finding': "Finding today's verse…",
    'today.signinPre': 'Reading never needs an account. ',
    'today.signinLink': 'Sign in',
    'today.signinPost': ' to keep notes and favorites.',
    'reader.immersion': 'Immersion',
    'reader.study': 'Study',
    'inspector.title': 'Context Inspector',
    'inspector.emptyTitle': 'Explore the text',
    'inspector.emptyMsg':
      'Tap any verse to see its meaning, context, how to live it, and related passages — explained by AI.',
    'settings.language': 'Language',
    'settings.appearance': 'Appearance',
    'study.subtitle': 'Ask about any verse.',
    'study.placeholder': 'John 3:16, or a phrase like "do not be anxious"',
    'study.explain': 'Explain',
    'study.results': '{n} results for "{q}"',
    'study.noMatch':
      'Nothing in the loaded chapters matches that. The sample set covers Genesis 1, Psalm 23 and 100, John 3, 1 Corinthians 13, and Philippians 4.',
    'notes.subtitle': 'What you noticed, in your own words.',
    'notes.placeholder': 'What stood out to you?',
    'notes.save': 'Save note',
    'notes.emptyTitle': 'Nothing written yet',
    'notes.emptyMsg': 'Read a verse, then come back and write one honest line about it.',
    'notes.signin': 'Notes sync to your account so they survive a new phone. Sign in to start writing.',
    'notes.delete': 'Delete',
    'tone.plain': 'Plain',
    'tone.devotional': 'Devotional',
    'tone.scholarly': 'Scholarly',
    'tone.kids': 'For kids',
  },
  fr: {
    'nav.today': "Aujourd'hui",
    'nav.reader': 'Lecture',
    'nav.study': 'Étude',
    'nav.notes': 'Notes',
    'nav.you': 'Vous',
    'nav.library': 'Bibliothèque',
    'nav.account': 'Compte',
    'brand.tagline': 'Étude biblique',
    'today.morning': 'Bonjour',
    'today.afternoon': 'Bon après-midi',
    'today.evening': 'Bonsoir',
    'today.subtitle': 'Prenez un instant avec un verset.',
    'today.reflect': 'Méditer ce verset',
    'today.openReader': 'Ouvrir la lecture',
    'today.finding': "Recherche du verset du jour…",
    'today.signinPre': 'La lecture ne demande aucun compte. ',
    'today.signinLink': 'Se connecter',
    'today.signinPost': ' pour garder notes et favoris.',
    'reader.immersion': 'Immersion',
    'reader.study': 'Étude',
    'inspector.title': 'Inspecteur de contexte',
    'inspector.emptyTitle': 'Explorer le texte',
    'inspector.emptyMsg':
      "Touchez un verset pour voir son sens, son contexte, comment le vivre, et des passages liés — expliqués par l'IA.",
    'settings.language': 'Langue',
    'settings.appearance': 'Apparence',
    'study.subtitle': 'Posez une question sur un verset.',
    'study.placeholder': 'Jean 3:16, ou une phrase comme « ne vous inquiétez pas »',
    'study.explain': 'Expliquer',
    'study.results': '{n} résultats pour « {q} »',
    'study.noMatch':
      "Aucun résultat dans les chapitres chargés. L'échantillon couvre Genèse 1, Psaumes 23 et 100, Jean 3, 1 Corinthiens 13 et Philippiens 4.",
    'notes.subtitle': 'Ce que vous avez remarqué, avec vos mots.',
    'notes.placeholder': "Qu'est-ce qui vous a marqué ?",
    'notes.save': 'Enregistrer la note',
    'notes.emptyTitle': 'Rien écrit pour le moment',
    'notes.emptyMsg': 'Lisez un verset, puis revenez écrire une ligne sincère à son sujet.',
    'notes.signin':
      'Les notes sont liées à votre compte pour survivre à un nouveau téléphone. Connectez-vous pour commencer.',
    'notes.delete': 'Supprimer',
    'tone.plain': 'Simple',
    'tone.devotional': 'Dévotionnel',
    'tone.scholarly': 'Savant',
    'tone.kids': 'Pour enfants',
  },
  es: {
    'nav.today': 'Hoy',
    'nav.reader': 'Lectura',
    'nav.study': 'Estudio',
    'nav.notes': 'Notas',
    'nav.you': 'Tú',
    'nav.library': 'Biblioteca',
    'nav.account': 'Cuenta',
    'brand.tagline': 'Estudio bíblico',
    'today.morning': 'Buenos días',
    'today.afternoon': 'Buenas tardes',
    'today.evening': 'Buenas noches',
    'today.subtitle': 'Tómate un momento con un versículo.',
    'today.reflect': 'Reflexionar en este versículo',
    'today.openReader': 'Abrir la lectura',
    'today.finding': 'Buscando el versículo de hoy…',
    'today.signinPre': 'La lectura no requiere una cuenta. ',
    'today.signinLink': 'Iniciar sesión',
    'today.signinPost': ' para guardar notas y favoritos.',
    'reader.immersion': 'Inmersión',
    'reader.study': 'Estudio',
    'inspector.title': 'Inspector de contexto',
    'inspector.emptyTitle': 'Explora el texto',
    'inspector.emptyMsg':
      'Toca cualquier versículo para ver su significado, contexto, cómo vivirlo y pasajes relacionados — explicados por IA.',
    'settings.language': 'Idioma',
    'settings.appearance': 'Apariencia',
    'study.subtitle': 'Pregunta sobre cualquier versículo.',
    'study.placeholder': 'Juan 3:16, o una frase como «no se angustien»',
    'study.explain': 'Explicar',
    'study.results': '{n} resultados para «{q}»',
    'study.noMatch':
      'Nada en los capítulos cargados coincide. La muestra cubre Génesis 1, Salmos 23 y 100, Juan 3, 1 Corintios 13 y Filipenses 4.',
    'notes.subtitle': 'Lo que notaste, con tus palabras.',
    'notes.placeholder': '¿Qué te llamó la atención?',
    'notes.save': 'Guardar nota',
    'notes.emptyTitle': 'Nada escrito aún',
    'notes.emptyMsg': 'Lee un versículo y luego vuelve a escribir una línea sincera sobre él.',
    'notes.signin':
      'Las notas se guardan en tu cuenta para sobrevivir a un teléfono nuevo. Inicia sesión para empezar.',
    'notes.delete': 'Eliminar',
    'tone.plain': 'Sencillo',
    'tone.devotional': 'Devocional',
    'tone.scholarly': 'Académico',
    'tone.kids': 'Para niños',
  },
  ht: {
    'nav.today': 'Jodi a',
    'nav.reader': 'Lekti',
    'nav.study': 'Etid',
    'nav.notes': 'Nòt',
    'nav.you': 'Ou',
    'nav.library': 'Bibliyotèk',
    'nav.account': 'Kont',
    'brand.tagline': 'Etid Biblik',
    'today.morning': 'Bonjou',
    'today.afternoon': 'Bon apremidi',
    'today.evening': 'Bonswa',
    'today.subtitle': 'Pran yon moman ak yon vèsè.',
    'today.reflect': 'Reflechi sou vèsè sa a',
    'today.openReader': 'Louvri lekti a',
    'today.finding': 'N ap chèche vèsè jodi a…',
    'today.signinPre': 'Lekti pa janm bezwen yon kont. ',
    'today.signinLink': 'Konekte',
    'today.signinPost': ' pou kenbe nòt ak favori.',
    'reader.immersion': 'Imèsyon',
    'reader.study': 'Etid',
    'inspector.title': 'Enspektè Kontèks',
    'inspector.emptyTitle': 'Eksplore tèks la',
    'inspector.emptyMsg':
      'Peze nenpòt vèsè pou wè sans li, kontèks li, kijan pou viv li, ak pasaj ki gen rapò — eksplike pa AI.',
    'settings.language': 'Lang',
    'settings.appearance': 'Aparans',
    'study.subtitle': 'Poze kesyon sou nenpòt vèsè.',
    'study.placeholder': 'Jan 3:16, oswa yon fraz tankou « pa enkyete w »',
    'study.explain': 'Eksplike',
    'study.results': '{n} rezilta pou « {q} »',
    'study.noMatch':
      'Anyen nan chapit ki chaje yo pa koresponn. Egzanp lan gen Jenèz 1, Sòm 23 ak 100, Jan 3, 1 Korentyen 13, ak Filipyen 4.',
    'notes.subtitle': 'Sa ou remake, nan pwòp mo pa w.',
    'notes.placeholder': 'Kisa ki frape w?',
    'notes.save': 'Anrejistre nòt la',
    'notes.emptyTitle': 'Anyen ekri poko',
    'notes.emptyMsg': 'Li yon vèsè, epi retounen ekri yon liy onèt sou li.',
    'notes.signin':
      'Nòt yo konekte ak kont ou pou yo siviv yon nouvo telefòn. Konekte pou kòmanse.',
    'notes.delete': 'Efase',
    'tone.plain': 'Senp',
    'tone.devotional': 'Devosyonèl',
    'tone.scholarly': 'Akademik',
    'tone.kids': 'Pou timoun',
  },
};

function detectLocale(): Locale {
  try {
    const nav = (globalThis as { navigator?: { language?: string } }).navigator;
    const two = (nav?.language ?? 'en').slice(0, 2).toLowerCase();
    return two === 'fr' ? 'fr' : two === 'es' ? 'es' : two === 'ht' ? 'ht' : 'en';
  } catch {
    return 'en';
  }
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await storage.getItem(KEY);
      if (!active) return;
      if (stored === 'en' || stored === 'fr' || stored === 'es' || stored === 'ht')
        setLocaleState(stored);
      else setLocaleState(detectLocale());
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void storage.setItem(KEY, next);
  }, []);

  const t = useCallback(
    (key: string) => STRINGS[locale][key] ?? STRINGS.en[key] ?? key,
    [locale],
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside <LocaleProvider>.');
  return context;
}
