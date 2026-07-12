from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CategoryIn(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    icon: str | None = "🎯"
    sort_order: int = 100

class CategoryOut(CategoryIn):
    id: int
    slug: str
    class Config:
        from_attributes = True

class GuideIn(BaseModel):
    title: str
    slug: str | None = None
    summary: str | None = None
    body: str
    image_urls: list[str] = Field(default_factory=list)
    keywords: str | None = None
    language: str = "en"
    priority: int = 100
    status: str = "published"
    category_id: int | None = None

class GuideOut(BaseModel):
    id: int
    title: str
    slug: str
    summary: str | None = None
    body: str
    image_urls: list[str] = Field(default_factory=list)
    keywords: str | None = None
    language: str = "en"
    priority: int = 100
    status: str
    category_id: int | None = None
    category_name: str | None = None
    category_icon: str | None = None
    class Config:
        from_attributes = True

class FAQIn(BaseModel):
    question: str
    answer: str
    keywords: str | None = None
    priority: int = 100
    status: str = "published"

class FAQOut(FAQIn):
    id: int
    class Config:
        from_attributes = True

class KnowledgeIn(BaseModel):
    title: str
    content: str
    keywords: str | None = None
    priority: int = 100
    status: str = "active"

class KnowledgeOut(KnowledgeIn):
    id: int
    class Config:
        from_attributes = True

class ThemeIn(BaseModel):
    app_name: str = "BDG Help Center"
    logo_text: str = "BDG"
    banner_title: str = "Official Help Center"
    banner_subtitle: str = "Find guides, FAQ, and AI support in one mobile help center."
    support_link: str = "https://t.me/your_support_bot"
    primary_color: str = "#f7c948"

class ThemeOut(ThemeIn):
    id: int = 1
    class Config:
        from_attributes = True

class AIPromptSectionIn(BaseModel):
    section_key: str
    title: str
    content: str = ""
    enabled: bool = True
    priority: int = 100

class AIPromptSectionOut(AIPromptSectionIn):
    id: int
    class Config:
        from_attributes = True

class AIModelSettingIn(BaseModel):
    provider: str = "deepseek"
    model: str = "deepseek-chat"
    api_base: str = "https://api.deepseek.com"
    enabled: bool = False
    temperature: float = 0.2
    max_tokens: int = 700
    require_approved_context: bool = True
    memory_enabled: bool = True
    memory_max_messages: int = 12
    memory_ttl_days: int = 30

class AIModelSettingOut(AIModelSettingIn):
    id: int = 1
    has_api_key: bool = False
    class Config:
        from_attributes = True

class MatchedGuide(BaseModel):
    id: int
    title: str
    summary: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    category_name: str | None = None
    score: int = 0

class ChatRequest(BaseModel):
    message: str
    locale: str | None = "en"
    session_id: str | None = None
    image_urls: list[str] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = Field(default_factory=list)
    guide_images: list[str] = Field(default_factory=list)
    matched_guides: list[MatchedGuide] = Field(default_factory=list)
    session_id: str
    memory_summary: str | None = None
    used_deepseek: bool = False
    model: str | None = None

class AITestRequest(BaseModel):
    message: str
    locale: str | None = "en"
    session_id: str | None = None
    image_urls: list[str] = Field(default_factory=list)
