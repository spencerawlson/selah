"""The canonical 66-book table — the single source of truth for book metadata.

Everything book-shaped derives from here: the seed's book records, the
multilingual reference resolver (``book_aliases``), and the data-build script.
Order is the standard Protestant canon, which every source dataset also follows,
so books line up by position across translations.

Columns: slug, English name, French name, Spanish name, abbreviation.
Books 1–39 are the Old Testament; 40–66 the New.
"""

from __future__ import annotations

from dataclasses import dataclass

# (slug, english, french, spanish, abbreviation)
_ROWS: tuple[tuple[str, str, str, str, str], ...] = (
    ("genesis", "Genesis", "Genèse", "Génesis", "Gen"),
    ("exodus", "Exodus", "Exode", "Éxodo", "Exo"),
    ("leviticus", "Leviticus", "Lévitique", "Levítico", "Lev"),
    ("numbers", "Numbers", "Nombres", "Números", "Num"),
    ("deuteronomy", "Deuteronomy", "Deutéronome", "Deuteronomio", "Deut"),
    ("joshua", "Joshua", "Josué", "Josué", "Josh"),
    ("judges", "Judges", "Juges", "Jueces", "Judg"),
    ("ruth", "Ruth", "Ruth", "Rut", "Ruth"),
    ("1-samuel", "1 Samuel", "1 Samuel", "1 Samuel", "1Sa"),
    ("2-samuel", "2 Samuel", "2 Samuel", "2 Samuel", "2Sa"),
    ("1-kings", "1 Kings", "1 Rois", "1 Reyes", "1Ki"),
    ("2-kings", "2 Kings", "2 Rois", "2 Reyes", "2Ki"),
    ("1-chronicles", "1 Chronicles", "1 Chroniques", "1 Crónicas", "1Ch"),
    ("2-chronicles", "2 Chronicles", "2 Chroniques", "2 Crónicas", "2Ch"),
    ("ezra", "Ezra", "Esdras", "Esdras", "Ezra"),
    ("nehemiah", "Nehemiah", "Néhémie", "Nehemías", "Neh"),
    ("esther", "Esther", "Esther", "Ester", "Est"),
    ("job", "Job", "Job", "Job", "Job"),
    ("psalms", "Psalms", "Psaumes", "Salmos", "Ps"),
    ("proverbs", "Proverbs", "Proverbes", "Proverbios", "Prov"),
    ("ecclesiastes", "Ecclesiastes", "Ecclésiaste", "Eclesiastés", "Eccl"),
    ("song-of-solomon", "Song of Solomon", "Cantique des Cantiques", "Cantares", "Song"),
    ("isaiah", "Isaiah", "Ésaïe", "Isaías", "Isa"),
    ("jeremiah", "Jeremiah", "Jérémie", "Jeremías", "Jer"),
    ("lamentations", "Lamentations", "Lamentations", "Lamentaciones", "Lam"),
    ("ezekiel", "Ezekiel", "Ézéchiel", "Ezequiel", "Ezek"),
    ("daniel", "Daniel", "Daniel", "Daniel", "Dan"),
    ("hosea", "Hosea", "Osée", "Oseas", "Hos"),
    ("joel", "Joel", "Joël", "Joel", "Joel"),
    ("amos", "Amos", "Amos", "Amós", "Amos"),
    ("obadiah", "Obadiah", "Abdias", "Abdías", "Obad"),
    ("jonah", "Jonah", "Jonas", "Jonás", "Jonah"),
    ("micah", "Micah", "Michée", "Miqueas", "Mic"),
    ("nahum", "Nahum", "Nahum", "Nahúm", "Nah"),
    ("habakkuk", "Habakkuk", "Habacuc", "Habacuc", "Hab"),
    ("zephaniah", "Zephaniah", "Sophonie", "Sofonías", "Zeph"),
    ("haggai", "Haggai", "Aggée", "Hageo", "Hag"),
    ("zechariah", "Zechariah", "Zacharie", "Zacarías", "Zech"),
    ("malachi", "Malachi", "Malachie", "Malaquías", "Mal"),
    ("matthew", "Matthew", "Matthieu", "Mateo", "Matt"),
    ("mark", "Mark", "Marc", "Marcos", "Mark"),
    ("luke", "Luke", "Luc", "Lucas", "Luke"),
    ("john", "John", "Jean", "Juan", "John"),
    ("acts", "Acts", "Actes", "Hechos", "Acts"),
    ("romans", "Romans", "Romains", "Romanos", "Rom"),
    ("1-corinthians", "1 Corinthians", "1 Corinthiens", "1 Corintios", "1Co"),
    ("2-corinthians", "2 Corinthians", "2 Corinthiens", "2 Corintios", "2Co"),
    ("galatians", "Galatians", "Galates", "Gálatas", "Gal"),
    ("ephesians", "Ephesians", "Éphésiens", "Efesios", "Eph"),
    ("philippians", "Philippians", "Philippiens", "Filipenses", "Php"),
    ("colossians", "Colossians", "Colossiens", "Colosenses", "Col"),
    ("1-thessalonians", "1 Thessalonians", "1 Thessaloniciens", "1 Tesalonicenses", "1Th"),
    ("2-thessalonians", "2 Thessalonians", "2 Thessaloniciens", "2 Tesalonicenses", "2Th"),
    ("1-timothy", "1 Timothy", "1 Timothée", "1 Timoteo", "1Ti"),
    ("2-timothy", "2 Timothy", "2 Timothée", "2 Timoteo", "2Ti"),
    ("titus", "Titus", "Tite", "Tito", "Titus"),
    ("philemon", "Philemon", "Philémon", "Filemón", "Phlm"),
    ("hebrews", "Hebrews", "Hébreux", "Hebreos", "Heb"),
    ("james", "James", "Jacques", "Santiago", "Jas"),
    ("1-peter", "1 Peter", "1 Pierre", "1 Pedro", "1Pe"),
    ("2-peter", "2 Peter", "2 Pierre", "2 Pedro", "2Pe"),
    ("1-john", "1 John", "1 Jean", "1 Juan", "1Jn"),
    ("2-john", "2 John", "2 Jean", "2 Juan", "2Jn"),
    ("3-john", "3 John", "3 Jean", "3 Juan", "3Jn"),
    ("jude", "Jude", "Jude", "Judas", "Jude"),
    ("revelation", "Revelation", "Apocalypse", "Apocalipsis", "Rev"),
)

_OLD_TESTAMENT_COUNT = 39


@dataclass(frozen=True)
class CanonBook:
    position: int  # 1-based canonical order
    slug: str
    name: str  # English
    name_fr: str
    name_es: str
    abbreviation: str
    testament: str  # "old" | "new"

    @property
    def reference_name(self) -> str:
        # Psalms is cited in the singular ("Psalm 23:1"); every other book cites
        # under its own name.
        return "Psalm" if self.slug == "psalms" else self.name

    def reference_name_for(self, language: str) -> str:
        """How this book is cited in a given language — "Actes", "Hechos"…"""
        if language == "fr":
            return "Psaume" if self.slug == "psalms" else self.name_fr
        if language == "es":
            return "Salmo" if self.slug == "psalms" else self.name_es
        return self.reference_name


CANON: tuple[CanonBook, ...] = tuple(
    CanonBook(
        position=i + 1,
        slug=slug,
        name=en,
        name_fr=fr,
        name_es=es,
        abbreviation=abbr,
        testament="old" if i < _OLD_TESTAMENT_COUNT else "new",
    )
    for i, (slug, en, fr, es, abbr) in enumerate(_ROWS)
)

BY_SLUG: dict[str, CanonBook] = {b.slug: b for b in CANON}
