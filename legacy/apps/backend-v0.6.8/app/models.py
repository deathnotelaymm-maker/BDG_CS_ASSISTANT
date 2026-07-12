from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="owner")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(20), nullable=True, default="🎯")
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    guides = relationship("Guide", back_populates="category")

class Guide(Base):
    __tablename__ = "guides"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(180), index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text)
    image_urls: Mapped[str | None] = mapped_column(Text, nullable=True)  # newline separated URLs
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)    # comma or newline separated keywords
    language: Mapped[str] = mapped_column(String(20), default="en")
    priority: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String(30), default="published")
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    category = relationship("Category", back_populates="guides")

class FAQ(Base):
    __tablename__ = "faqs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question: Mapped[str] = mapped_column(String(255), index=True)
    answer: Mapped[str] = mapped_column(Text)
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String(30), default="published")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(180), index=True)
    content: Mapped[str] = mapped_column(Text)
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String(30), default="active")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ThemeSetting(Base):
    __tablename__ = "theme_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    app_name: Mapped[str] = mapped_column(String(160), default="BDG Help Center")
    logo_text: Mapped[str] = mapped_column(String(40), default="BDG")
    banner_title: Mapped[str] = mapped_column(String(200), default="Official Help Center")
    banner_subtitle: Mapped[str] = mapped_column(String(255), default="Find guides, FAQ, and AI support in one mobile help center.")
    support_link: Mapped[str] = mapped_column(String(500), default="https://t.me/your_support_bot")
    primary_color: Mapped[str] = mapped_column(String(40), default="#f7c948")
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AIPromptSection(Base):
    __tablename__ = "ai_prompt_sections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    section_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    content: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AIModelSetting(Base):
    __tablename__ = "ai_model_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    provider: Mapped[str] = mapped_column(String(50), default="deepseek")
    model: Mapped[str] = mapped_column(String(120), default="deepseek-chat")
    api_base: Mapped[str] = mapped_column(String(500), default="https://api.deepseek.com")
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.2)
    max_tokens: Mapped[int] = mapped_column(Integer, default=700)
    require_approved_context: Mapped[bool] = mapped_column(Boolean, default=True)
    memory_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    memory_max_messages: Mapped[int] = mapped_column(Integer, default=12)
    memory_ttl_days: Mapped[int] = mapped_column(Integer, default=30)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    memory_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ChatMemoryMessage(Base):
    __tablename__ = "chat_memory_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(120), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    image_urls: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ChatLog(Base):
    __tablename__ = "chat_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    customer_message: Mapped[str] = mapped_column(Text)
    assistant_reply: Mapped[str] = mapped_column(Text)
    matched_sources: Mapped[str | None] = mapped_column(Text, nullable=True)
    matched_images: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_images: Mapped[str | None] = mapped_column(Text, nullable=True)
    used_deepseek: Mapped[bool] = mapped_column(Boolean, default=False)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
