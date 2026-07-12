import re
from typing import Iterable

STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "is", "are", "am",
    "i", "you", "we", "they", "how", "what", "why", "can", "do", "does", "did", "please",
    "my", "me", "your", "sir", "madam", "boss", "babe", "want", "need", "help"
}

SYNONYMS = {
    "withdraw": {"withdraw", "withdrawal", "cashout", "cash", "payout", "money"},
    "deposit": {"deposit", "recharge", "topup", "top", "pay", "payment"},
    "bank": {"bank", "card", "upi", "wallet", "bind", "binding"},
    "login": {"login", "signin", "sign", "password", "otp", "account", "freeze", "locked"},
    "promotion": {"promotion", "bonus", "activity", "invite", "invitation", "reward"},
    "app": {"app", "download", "install", "android", "ios", "desktop"},
}

def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value).strip("-")
    return value or "item"

def split_urls(value: str | None) -> list[str]:
    if not value:
        return []
    return [line.strip() for line in value.splitlines() if line.strip()]

def join_urls(urls: Iterable[str] | None) -> str:
    return "\n".join([u.strip() for u in (urls or []) if u and u.strip()])

def split_keywords(value: str | None) -> list[str]:
    if not value:
        return []
    raw = re.split(r"[,\n|;]+", value)
    return [x.strip().lower() for x in raw if x.strip()]

def words(text: str) -> set[str]:
    # Supports English plus unicode words for Burmese/Chinese-ish strings.
    found = re.findall(r"[\w\u1000-\u109f\u4e00-\u9fff]+", (text or "").lower(), flags=re.UNICODE)
    return {w for w in found if len(w) > 1 and w not in STOPWORDS}

def expand_terms(terms: set[str]) -> set[str]:
    expanded = set(terms)
    for group in SYNONYMS.values():
        if terms & group:
            expanded |= group
    return expanded

def keyword_score(query: str, keyword_text: str | None) -> int:
    q = (query or "").lower()
    score = 0
    for kw in split_keywords(keyword_text):
        if not kw:
            continue
        if kw in q:
            score += 8 + min(len(kw), 20)
        else:
            kw_words = expand_terms(words(kw))
            q_words = expand_terms(words(q))
            score += len(kw_words & q_words) * 4
    return score

def score_match(query: str, *texts: str, keyword_text: str | None = None) -> int:
    q_words = expand_terms(words(query))
    hay_words = expand_terms(words(" ".join(t or "" for t in texts)))
    score = len(q_words & hay_words) * 3
    score += keyword_score(query, keyword_text)
    q = (query or "").lower().strip()
    hay = " ".join(t or "" for t in texts).lower()
    if q and q in hay:
        score += 20
    return score

def first_sentences(text: str, limit: int = 260) -> str:
    clean = re.sub(r"\s+", " ", (text or "")).strip()
    if len(clean) <= limit:
        return clean
    return clean[:limit].rsplit(" ", 1)[0] + "..."
