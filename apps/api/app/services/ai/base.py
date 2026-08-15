"""The AI provider contract.

Everything above this layer — routers, services, the mobile app — depends on
`ExplanationProvider` and nothing else. Swapping the mock for OpenAI, Azure, or
a local llama.cpp server is a config change, never a code change.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from pydantic import BaseModel, Field


class RelatedVerse(BaseModel):
    reference: str
    reason: str


class GeneratedExplanation(BaseModel):
    """The structured output every provider must return.

    This model *is* the contract with the LLM: it is serialised into the
    response-format JSON schema, and it validates whatever comes back. A
    provider that cannot fill these four fields is not usable here.
    """

    summary: str = Field(description="One memorable sentence capturing the verse.")
    meaning: str = Field(description="Plain-language explanation of what it says.")
    context: str = Field(description="Author, audience, and surrounding passage.")
    application: str = Field(description="A concrete way to live this today.")
    related_verses: list[RelatedVerse] = Field(default_factory=list, max_length=5)


class GeneratedChapterSummary(BaseModel):
    summary: str
    themes: list[str] = Field(default_factory=list, max_length=5)


@dataclass(frozen=True)
class VerseContext:
    """Everything a provider needs to explain a verse well.

    Neighbouring verses matter: explaining John 3:16 without 3:14–18 produces
    confident nonsense. The service layer fills these in.
    """

    reference: str
    text: str
    book_name: str
    chapter_number: int
    verse_number: int
    translation_code: str
    surrounding_text: str = ""


@runtime_checkable
class ExplanationProvider(Protocol):
    """Implemented by `MockProvider` and `OpenAICompatibleProvider`."""

    name: str
    model: str

    async def explain(self, verse: VerseContext, tone: str = "plain") -> GeneratedExplanation: ...

    async def summarize_chapter(
        self, book_name: str, chapter_number: int, verses: list[str]
    ) -> GeneratedChapterSummary: ...
