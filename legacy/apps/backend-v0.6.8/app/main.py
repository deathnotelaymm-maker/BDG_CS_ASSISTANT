import os
import re
import secrets
from pathlib import Path
from .env import load_local_env
load_local_env()
import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import (
    AIModelSetting,
    AIPromptSection,
    AdminUser,
    Category,
    ChatLog,
    ChatMemoryMessage,
    ChatSession,
    FAQ,
    Guide,
    KnowledgeItem,
    ThemeSetting,
)
from .schemas import (
    AIModelSettingIn,
    AIModelSettingOut,
    AIPromptSectionIn,
    AIPromptSectionOut,
    AITestRequest,
    CategoryIn,
    CategoryOut,
    ChatRequest,
    ChatResponse,
    FAQIn,
    FAQOut,
    GuideIn,
    GuideOut,
    KnowledgeIn,
    KnowledgeOut,
    LoginRequest,
    LoginResponse,
    MatchedGuide,
    ThemeIn,
    ThemeOut,
)
from .security import create_token, current_admin, verify_password
from .seed import seed_database
from .utils import first_sentences, join_urls, score_match, slugify, split_urls

APP_NAME = os.getenv("APP_NAME", "BDG Help Center")
SUPPORT_LINK = os.getenv("SUPPORT_LINK", "https://t.me/your_support_bot")
ALLOWED_ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "*").split(",") if x.strip()]
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "8"))
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEFAULT_DEEPSEEK_BASE = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")
DEFAULT_DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

app = FastAPI(title=APP_NAME, version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Local SQLite compatibility migration for users upgrading from older ZIPs.
def ensure_lightweight_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    additions = {
        "categories": [("icon", "VARCHAR(20) DEFAULT '🎯'"), ("sort_order", "INTEGER DEFAULT 100")],
        "guides": [("keywords", "TEXT"), ("language", "VARCHAR(20) DEFAULT 'en'"), ("priority", "INTEGER DEFAULT 100")],
        "faqs": [("keywords", "TEXT"), ("priority", "INTEGER DEFAULT 100")],
        "knowledge_items": [("keywords", "TEXT"), ("priority", "INTEGER DEFAULT 100")],
        "chat_logs": [
            ("matched_images", "TEXT"),
            ("session_id", "VARCHAR(120)"),
            ("uploaded_images", "TEXT"),
            ("used_deepseek", "BOOLEAN DEFAULT 0"),
            ("model", "VARCHAR(120)"),
        ],
    }
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, cols in additions.items():
            if table not in tables:
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_lightweight_columns()
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": APP_NAME,
        "version": "0.4.0",
        "features": ["ai-mode-control-center", "deepseek", "smart-memory", "smart-guide-images", "image-upload"],
    }

@app.get("/")
def root():
    return {
        "ok": True,
        "service": APP_NAME,
        "version": "0.4.0",
        "message": "Backend API is running. Open /docs for API docs.",
        "public_sites": ["guide-site", "chat-site"],
        "admin_site": "admin-site",
    }

# Common helpers
def get_theme(db: Session) -> ThemeSetting:
    theme = db.query(ThemeSetting).first()
    if not theme:
        theme = ThemeSetting(app_name=APP_NAME, support_link=SUPPORT_LINK)
        db.add(theme)
        db.commit()
        db.refresh(theme)
    return theme

def get_ai_settings(db: Session) -> AIModelSetting:
    settings = db.query(AIModelSetting).first()
    if not settings:
        settings = AIModelSetting(
            provider="deepseek",
            model=DEFAULT_DEEPSEEK_MODEL,
            api_base=DEFAULT_DEEPSEEK_BASE,
            enabled=False,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def ai_settings_out(settings: AIModelSetting) -> AIModelSettingOut:
    return AIModelSettingOut(
        id=settings.id,
        provider=settings.provider,
        model=settings.model,
        api_base=settings.api_base,
        enabled=settings.enabled,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        require_approved_context=settings.require_approved_context,
        memory_enabled=settings.memory_enabled,
        memory_max_messages=settings.memory_max_messages,
        memory_ttl_days=settings.memory_ttl_days,
        has_api_key=bool(DEEPSEEK_API_KEY),
    )

def category_out(cat: Category) -> CategoryOut:
    return CategoryOut(id=cat.id, name=cat.name, slug=cat.slug, description=cat.description, icon=cat.icon or "🎯", sort_order=cat.sort_order or 100)

def guide_out(guide: Guide) -> GuideOut:
    return GuideOut(
        id=guide.id,
        title=guide.title,
        slug=guide.slug,
        summary=guide.summary,
        body=guide.body,
        image_urls=split_urls(guide.image_urls),
        keywords=guide.keywords,
        language=guide.language or "en",
        priority=guide.priority or 100,
        status=guide.status,
        category_id=guide.category_id,
        category_name=guide.category.name if guide.category else None,
        category_icon=guide.category.icon if guide.category else None,
    )

def safe_upload_name(filename: str) -> str:
    suffix = Path(filename or "image.png").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        raise HTTPException(status_code=400, detail="Only png, jpg, jpeg, webp, and gif files are allowed")
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(filename).stem).strip("-")[:40] or "guide-image"
    return f"{stem}-{secrets.token_hex(6)}{suffix}"

async def save_upload(request: Request, file: UploadFile, prefix: str = "image") -> dict:
    data = await file.read()
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_MB} MB")
    name = safe_upload_name(file.filename or f"{prefix}.png")
    path = UPLOAD_DIR / name
    path.write_bytes(data)
    url = str(request.base_url).rstrip("/") + f"/uploads/{name}"
    return {"ok": True, "filename": name, "url": url}

# Public settings
@app.get("/settings", response_model=ThemeOut)
def public_settings(db: Session = Depends(get_db)):
    return get_theme(db)

@app.put("/admin/settings", response_model=ThemeOut)
def update_settings(payload: ThemeIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    theme = get_theme(db)
    for key, value in payload.model_dump().items():
        setattr(theme, key, value)
    db.commit()
    db.refresh(theme)
    return theme

@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.email == payload.email, AdminUser.is_active == True).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return LoginResponse(access_token=create_token(user.email, user.role))

# Upload endpoints
@app.post("/admin/uploads")
async def upload_image(request: Request, file: UploadFile = File(...), _admin=Depends(current_admin)):
    return await save_upload(request, file, prefix="guide-image")

@app.post("/chat/uploads")
async def upload_customer_image(request: Request, file: UploadFile = File(...)):
    # Customer upload is allowed for screenshots/receipts; AI cannot approve payment from image alone.
    return await save_upload(request, file, prefix="customer-image")

# Public Guide API
@app.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return [category_out(x) for x in db.query(Category).order_by(Category.sort_order.asc(), Category.name.asc()).all()]

@app.get("/guides", response_model=list[GuideOut])
def list_guides(q: str | None = Query(default=None), category: str | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(Guide).filter(Guide.status == "published")
    if category:
        query = query.join(Category).filter(Category.slug == category)
    guides = query.order_by(Guide.priority.asc(), Guide.updated_at.desc()).all()
    if q:
        guides = [g for g in guides if score_match(q, g.title, g.summary or "", g.body, keyword_text=g.keywords) > 0]
        guides.sort(key=lambda g: (-(score_match(q, g.title, g.summary or "", g.body, keyword_text=g.keywords)), g.priority or 100))
    return [guide_out(g) for g in guides]

@app.get("/guides/{slug}", response_model=GuideOut)
def get_guide(slug: str, db: Session = Depends(get_db)):
    guide = db.query(Guide).filter(Guide.slug == slug, Guide.status == "published").first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return guide_out(guide)

@app.get("/faqs", response_model=list[FAQOut])
def list_faqs(db: Session = Depends(get_db)):
    return db.query(FAQ).filter(FAQ.status == "published").order_by(FAQ.priority.asc(), FAQ.id.desc()).all()

# AI Mode helpers
def guide_match_score(message: str, guide: Guide) -> int:
    base = score_match(message, guide.title, guide.summary or "", guide.body, keyword_text=guide.keywords)
    priority_bonus = max(0, 120 - (guide.priority or 100)) // 10
    image_bonus = 2 if split_urls(guide.image_urls) else 0
    return base + priority_bonus + image_bonus

def find_matches(message: str, db: Session):
    guide_candidates: list[tuple[int, Guide]] = []
    for g in db.query(Guide).filter(Guide.status == "published").all():
        score = guide_match_score(message, g)
        if score > 0:
            guide_candidates.append((score, g))
    guide_candidates.sort(key=lambda x: (x[0], -(x[1].priority or 100)), reverse=True)

    faq_candidates: list[tuple[int, FAQ]] = []
    for f in db.query(FAQ).filter(FAQ.status == "published").all():
        score = score_match(message, f.question, f.answer, keyword_text=f.keywords)
        if score > 0:
            faq_candidates.append((score + max(0, 120 - (f.priority or 100)) // 10, f))
    faq_candidates.sort(key=lambda x: x[0], reverse=True)

    knowledge_candidates: list[tuple[int, KnowledgeItem]] = []
    for k in db.query(KnowledgeItem).filter(KnowledgeItem.status == "active").all():
        score = score_match(message, k.title, k.content, keyword_text=k.keywords)
        if score > 0:
            knowledge_candidates.append((score + max(0, 120 - (k.priority or 100)) // 10, k))
    knowledge_candidates.sort(key=lambda x: x[0], reverse=True)

    top_guide_score = guide_candidates[0][0] if guide_candidates else 0
    selected_guides = [x for x in guide_candidates if x[0] >= max(10, int(top_guide_score * 0.25))][:2]
    return selected_guides, faq_candidates[:2], knowledge_candidates[:2]

def ensure_chat_session(session_id: str | None, db: Session) -> ChatSession:
    clean = re.sub(r"[^a-zA-Z0-9_.:-]", "", session_id or "")[:100]
    if not clean:
        clean = f"guest-{secrets.token_hex(12)}"
    session = db.query(ChatSession).filter(ChatSession.session_id == clean).first()
    if not session:
        session = ChatSession(session_id=clean, memory_summary="", message_count=0)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session

def build_approved_context(selected_guides, selected_faqs, selected_knowledge, uploaded_images: list[str], theme: ThemeSetting) -> tuple[str, list[str], list[str], list[MatchedGuide]]:
    sources: list[str] = []
    images: list[str] = []
    matched_guides: list[MatchedGuide] = []
    parts: list[str] = []

    for score, f in selected_faqs:
        sources.append(f"FAQ: {f.question}")
        parts.append(f"FAQ: {f.question}\nApproved answer: {f.answer}")
    for score, guide in selected_guides:
        guide_images = split_urls(guide.image_urls)
        images.extend(guide_images)
        sources.append(f"Guide: {guide.title}")
        matched_guides.append(MatchedGuide(
            id=guide.id,
            title=guide.title,
            summary=guide.summary,
            image_urls=guide_images,
            category_name=guide.category.name if guide.category else None,
            score=score,
        ))
        parts.append(f"Guide: {guide.title}\nSummary: {guide.summary or ''}\nSteps: {first_sentences(guide.body, 700)}")
    for score, k in selected_knowledge:
        sources.append(f"Knowledge: {k.title}")
        parts.append(f"Knowledge: {k.title}\n{k.content}")
    if uploaded_images:
        parts.append("Customer uploaded image/receipt URLs: " + ", ".join(uploaded_images))
    parts.append(f"Official support link: {theme.support_link}")

    deduped_images = []
    seen = set()
    for img in images:
        if img not in seen:
            seen.add(img)
            deduped_images.append(img)
    return "\n\n".join(parts), sources, deduped_images, matched_guides

def build_prompt(db: Session, approved_context: str, memory_summary: str | None, uploaded_images: list[str]) -> str:
    sections = db.query(AIPromptSection).filter(AIPromptSection.enabled == True).order_by(AIPromptSection.priority.asc()).all()
    section_text = "\n\n".join([f"## {s.title}\n{s.content}" for s in sections])
    memory_text = memory_summary or "No prior memory for this customer session."
    image_note = "Customer uploaded images are present. Follow Image / Receipt Rules strictly." if uploaded_images else "No customer image uploaded in this message."
    return f"""{section_text}

## Approved Context
{approved_context or 'No approved context matched.'}

## Customer Memory
{memory_text}

## Image Context
{image_note}

## Final Instruction
Answer the customer using only the prompt rules and approved context. Keep it short, helpful, and safe. If approved context is not enough, use the fallback/escalation rules.""".strip()

def local_fallback_reply(selected_guides, selected_faqs, selected_knowledge, uploaded_images: list[str], theme: ThemeSetting) -> str:
    reply_parts: list[str] = []
    if selected_faqs:
        reply_parts.append(selected_faqs[0][1].answer)
    if selected_guides:
        reply_parts.append("Please follow the matched guide below:")
        for _score, guide in selected_guides:
            steps = first_sentences(guide.body, 340)
            reply_parts.append(f"• {guide.title}\n{guide.summary or steps}")
    if selected_knowledge and not reply_parts:
        reply_parts.append(first_sentences(selected_knowledge[0][1].content, 520))
    if uploaded_images:
        reply_parts.append("I received your uploaded image. I can guide you, but I cannot approve payment, withdrawal, bonus, or account changes from an image. Please contact official support for verification.")
    if not reply_parts:
        return f"Sorry, I do not have an approved guide for this question yet.\n\nPlease contact official support: {theme.support_link}"
    return "\n\n".join(reply_parts) + f"\n\nNeed more help? Contact official support: {theme.support_link}"

def call_deepseek(settings: AIModelSetting, system_prompt: str, user_message: str) -> str | None:
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not settings.enabled or not api_key:
        return None
    base = (settings.api_base or DEFAULT_DEEPSEEK_BASE).rstrip("/")
    url = f"{base}/chat/completions"
    payload = {
        "model": settings.model or DEFAULT_DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": settings.temperature or 0.2,
        "max_tokens": settings.max_tokens or 700,
        "stream": False,
    }
    try:
        with httpx.Client(timeout=25) as client:
            res = client.post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload)
            res.raise_for_status()
            data = res.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content")
    except Exception:
        return None

def update_memory(db: Session, session: ChatSession, user_message: str, assistant_reply: str, uploaded_images: list[str], max_messages: int = 12) -> None:
    db.add(ChatMemoryMessage(session_id=session.session_id, role="user", content=user_message, image_urls=join_urls(uploaded_images)))
    db.add(ChatMemoryMessage(session_id=session.session_id, role="assistant", content=assistant_reply, image_urls=""))
    session.message_count = (session.message_count or 0) + 1
    db.commit()

    recent = db.query(ChatMemoryMessage).filter(ChatMemoryMessage.session_id == session.session_id).order_by(ChatMemoryMessage.id.desc()).limit(max(4, max_messages)).all()
    recent = list(reversed(recent))
    compact = []
    for m in recent:
        text_part = first_sentences(m.content, 160)
        img_part = " [image uploaded]" if split_urls(m.image_urls) else ""
        compact.append(f"{m.role}: {text_part}{img_part}")
    session.memory_summary = "Recent session memory:\n" + "\n".join(compact)
    db.commit()

def run_ai_chat(payload: ChatRequest, db: Session, admin_test: bool = False) -> ChatResponse:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    theme = get_theme(db)
    settings = get_ai_settings(db)
    session = ensure_chat_session(payload.session_id, db)

    selected_guides, selected_faqs, selected_knowledge = find_matches(message, db)
    approved_context, sources, deduped_images, matched_guides = build_approved_context(selected_guides, selected_faqs, selected_knowledge, payload.image_urls, theme)
    system_prompt = build_prompt(db, approved_context, session.memory_summary, payload.image_urls)

    should_call_deepseek = settings.enabled and bool(DEEPSEEK_API_KEY)
    if settings.require_approved_context and not (selected_guides or selected_faqs or selected_knowledge or payload.image_urls):
        should_call_deepseek = False

    deepseek_reply = call_deepseek(settings, system_prompt, message) if should_call_deepseek else None
    used_deepseek = bool(deepseek_reply)
    reply = deepseek_reply or local_fallback_reply(selected_guides, selected_faqs, selected_knowledge, payload.image_urls, theme)

    if settings.memory_enabled and not admin_test:
        update_memory(db, session, message, reply, payload.image_urls, max_messages=settings.memory_max_messages or 12)
        db.refresh(session)

    if not admin_test:
        db.add(ChatLog(
            session_id=session.session_id,
            customer_message=message,
            assistant_reply=reply,
            matched_sources="\n".join(sources),
            matched_images="\n".join(deduped_images),
            uploaded_images=join_urls(payload.image_urls),
            used_deepseek=used_deepseek,
            model=settings.model if used_deepseek else "local-fallback",
        ))
        db.commit()

    return ChatResponse(
        reply=reply,
        sources=sources,
        guide_images=deduped_images,
        matched_guides=matched_guides,
        session_id=session.session_id,
        memory_summary=session.memory_summary,
        used_deepseek=used_deepseek,
        model=settings.model if used_deepseek else "local-fallback",
    )

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    return run_ai_chat(payload, db, admin_test=False)

# Admin routes
@app.get("/admin/categories", response_model=list[CategoryOut])
def admin_categories(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return [category_out(x) for x in db.query(Category).order_by(Category.sort_order.asc(), Category.name.asc()).all()]

@app.post("/admin/categories", response_model=CategoryOut)
def create_category(payload: CategoryIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    slug = payload.slug or slugify(payload.name)
    cat = Category(name=payload.name, slug=slug, description=payload.description, icon=payload.icon or "🎯", sort_order=payload.sort_order)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return category_out(cat)

@app.put("/admin/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, payload: CategoryIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.name = payload.name
    cat.slug = payload.slug or slugify(payload.name)
    cat.description = payload.description
    cat.icon = payload.icon or "🎯"
    cat.sort_order = payload.sort_order
    db.commit()
    db.refresh(cat)
    return category_out(cat)

@app.delete("/admin/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return {"ok": True}

@app.get("/admin/guides", response_model=list[GuideOut])
def admin_guides(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return [guide_out(g) for g in db.query(Guide).order_by(Guide.priority.asc(), Guide.updated_at.desc()).all()]

@app.post("/admin/guides", response_model=GuideOut)
def create_guide(payload: GuideIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    guide = Guide(
        title=payload.title,
        slug=payload.slug or slugify(payload.title),
        summary=payload.summary,
        body=payload.body,
        image_urls=join_urls(payload.image_urls),
        keywords=payload.keywords,
        language=payload.language,
        priority=payload.priority,
        status=payload.status,
        category_id=payload.category_id,
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)
    return guide_out(guide)

@app.put("/admin/guides/{guide_id}", response_model=GuideOut)
def update_guide(guide_id: int, payload: GuideIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    guide = db.get(Guide, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    guide.title = payload.title
    guide.slug = payload.slug or slugify(payload.title)
    guide.summary = payload.summary
    guide.body = payload.body
    guide.image_urls = join_urls(payload.image_urls)
    guide.keywords = payload.keywords
    guide.language = payload.language
    guide.priority = payload.priority
    guide.status = payload.status
    guide.category_id = payload.category_id
    db.commit()
    db.refresh(guide)
    return guide_out(guide)

@app.delete("/admin/guides/{guide_id}")
def delete_guide(guide_id: int, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    guide = db.get(Guide, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    db.delete(guide)
    db.commit()
    return {"ok": True}

@app.get("/admin/faqs", response_model=list[FAQOut])
def admin_faqs(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return db.query(FAQ).order_by(FAQ.priority.asc(), FAQ.id.desc()).all()

@app.post("/admin/faqs", response_model=FAQOut)
def create_faq(payload: FAQIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    faq = FAQ(question=payload.question, answer=payload.answer, keywords=payload.keywords, priority=payload.priority, status=payload.status)
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@app.put("/admin/faqs/{faq_id}", response_model=FAQOut)
def update_faq(faq_id: int, payload: FAQIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    faq = db.get(FAQ, faq_id)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    faq.question = payload.question
    faq.answer = payload.answer
    faq.keywords = payload.keywords
    faq.priority = payload.priority
    faq.status = payload.status
    db.commit()
    db.refresh(faq)
    return faq

@app.delete("/admin/faqs/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    faq = db.get(FAQ, faq_id)
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()
    return {"ok": True}

@app.get("/admin/knowledge", response_model=list[KnowledgeOut])
def admin_knowledge(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return db.query(KnowledgeItem).order_by(KnowledgeItem.priority.asc(), KnowledgeItem.id.desc()).all()

@app.post("/admin/knowledge", response_model=KnowledgeOut)
def create_knowledge(payload: KnowledgeIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    item = KnowledgeItem(title=payload.title, content=payload.content, keywords=payload.keywords, priority=payload.priority, status=payload.status)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.put("/admin/knowledge/{item_id}", response_model=KnowledgeOut)
def update_knowledge(item_id: int, payload: KnowledgeIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    item = db.get(KnowledgeItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    item.title = payload.title
    item.content = payload.content
    item.keywords = payload.keywords
    item.priority = payload.priority
    item.status = payload.status
    db.commit()
    db.refresh(item)
    return item

@app.delete("/admin/knowledge/{item_id}")
def delete_knowledge(item_id: int, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    item = db.get(KnowledgeItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

# AI Mode admin routes
@app.get("/admin/ai/prompts", response_model=list[AIPromptSectionOut])
def list_ai_prompts(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return db.query(AIPromptSection).order_by(AIPromptSection.priority.asc(), AIPromptSection.id.asc()).all()

@app.post("/admin/ai/prompts", response_model=AIPromptSectionOut)
def create_ai_prompt(payload: AIPromptSectionIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    # Section keys are unique. If admin creates an existing key, update it instead of crashing.
    item = db.query(AIPromptSection).filter(AIPromptSection.section_key == payload.section_key).first()
    if item:
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
    else:
        item = AIPromptSection(**payload.model_dump())
        db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.put("/admin/ai/prompts/{prompt_id}", response_model=AIPromptSectionOut)
def update_ai_prompt(prompt_id: int, payload: AIPromptSectionIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    item = db.get(AIPromptSection, prompt_id)
    if not item:
        raise HTTPException(status_code=404, detail="AI prompt section not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/admin/ai/prompts/{prompt_id}")
def delete_ai_prompt(prompt_id: int, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    item = db.get(AIPromptSection, prompt_id)
    if not item:
        raise HTTPException(status_code=404, detail="AI prompt section not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

@app.get("/admin/ai/settings", response_model=AIModelSettingOut)
def read_ai_settings(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return ai_settings_out(get_ai_settings(db))

@app.put("/admin/ai/settings", response_model=AIModelSettingOut)
def update_ai_settings(payload: AIModelSettingIn, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    settings = get_ai_settings(db)
    for key, value in payload.model_dump().items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return ai_settings_out(settings)

@app.post("/admin/ai/test", response_model=ChatResponse)
def test_ai(payload: AITestRequest, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    return run_ai_chat(ChatRequest(**payload.model_dump()), db, admin_test=True)

@app.get("/admin/chat-sessions")
def chat_sessions(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    sessions = db.query(ChatSession).order_by(ChatSession.id.desc()).limit(100).all()
    return [{
        "id": x.id,
        "session_id": x.session_id,
        "memory_summary": x.memory_summary,
        "message_count": x.message_count,
        "created_at": str(x.created_at),
        "updated_at": str(x.updated_at),
    } for x in sessions]

@app.delete("/admin/chat-sessions/{session_id}")
def clear_chat_session(session_id: str, db: Session = Depends(get_db), _admin=Depends(current_admin)):
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if session:
        session.memory_summary = ""
        session.message_count = 0
    db.query(ChatMemoryMessage).filter(ChatMemoryMessage.session_id == session_id).delete()
    db.commit()
    return {"ok": True}

@app.get("/admin/chat-logs")
def chat_logs(db: Session = Depends(get_db), _admin=Depends(current_admin)):
    logs = db.query(ChatLog).order_by(ChatLog.id.desc()).limit(100).all()
    return [{
        "id": x.id,
        "session_id": x.session_id,
        "customer_message": x.customer_message,
        "assistant_reply": x.assistant_reply,
        "matched_sources": split_urls(x.matched_sources),
        "matched_images": split_urls(x.matched_images),
        "uploaded_images": split_urls(x.uploaded_images),
        "used_deepseek": bool(x.used_deepseek),
        "model": x.model,
        "created_at": str(x.created_at),
    } for x in logs]
