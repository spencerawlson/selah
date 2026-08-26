"""Prompt library.

Prompts live in one reviewable file on purpose. This app puts words in the mouth
of scripture for people who trust it, so changes here deserve the same scrutiny
as a schema migration.
"""

from __future__ import annotations

from app.services.ai.base import VerseContext

SYSTEM_PROMPT = """\
You are a careful Bible study guide. You explain scripture in clear, warm, \
everyday language for ordinary readers.

Rules you never break:
- Explain what the text says. Do not invent history, authorship, or doctrine.
- Where sincere Christian traditions read a passage differently, say so briefly \
and neutrally rather than picking a side.
- Never give medical, legal, or financial direction, and never tell the reader \
that a specific life decision is God's will for them.
- Keep it short. A reader on a phone should finish each section in one breath.
- If the passage is genuinely difficult or disputed, say that plainly instead of \
smoothing it over.

Return only the requested JSON object.\
"""

TONE_GUIDANCE = {
    "plain": "Neutral and clear. Short sentences. No jargon, no church insider language.",
    "devotional": "Warm and pastoral, second person, still grounded in the text.",
    "scholarly": (
        "Precise. Name the genre, the historical setting, and key original-language terms "
        "when they change the meaning. Still accessible to a non-specialist."
    ),
    "kids": "For a curious 9-year-old. Concrete images, no abstractions, gentle.",
}

LANGUAGE_NAMES = {
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "ht": "Haitian Creole",
}


def build_explanation_prompt(verse: VerseContext, tone: str = "plain", language: str = "en") -> str:
    guidance = TONE_GUIDANCE.get(tone, TONE_GUIDANCE["plain"])
    language_name = LANGUAGE_NAMES.get(language, "English")
    surrounding = (
        "\nSurrounding passage (for context only — do not explain these):\n"
        f"{verse.surrounding_text}"
        if verse.surrounding_text
        else ""
    )
    return f"""\
Explain this verse.

Reference: {verse.reference} ({verse.translation_code})
Text: "{verse.text}"
{surrounding}

Tone: {guidance}
Write every field of the JSON (summary, meaning, context, application, and each related_verses reason) in {language_name}. Keep Bible references in standard Book Chapter:Verse form.

Produce JSON with these fields:
- summary: one sentence (max 25 words) a reader could repeat from memory.
- meaning: 2-3 sentences on what the verse actually says.
- context: 2-3 sentences on who wrote it, to whom, and what surrounds it.
- application: 2-3 sentences with one concrete, doable step for today.
- related_verses: 2-4 items, each {{"reference": "Book C:V", "reason": "<12 words>"}}. \
Use real references that genuinely connect.
"""


def build_chapter_summary_prompt(book_name: str, chapter_number: int, verses: list[str]) -> str:
    body = "\n".join(verses)
    return f"""\
Summarise {book_name} {chapter_number}.

{body}

Produce JSON with:
- summary: 3-4 sentences on what happens and why it matters.
- themes: 2-4 short theme labels (2-4 words each).
"""
