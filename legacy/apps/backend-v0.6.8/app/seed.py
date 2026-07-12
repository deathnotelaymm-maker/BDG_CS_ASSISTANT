import os
from sqlalchemy.orm import Session
from .models import AdminUser, Category, FAQ, Guide, KnowledgeItem, ThemeSetting, AIPromptSection, AIModelSetting
from .security import hash_password
from .utils import slugify

GUIDE_BODY_BANK = """1. Open Wallet or Profile.
2. Choose Bank Card or Payment Method.
3. Fill in the correct bank card information.
4. Check the name, card number, and bank carefully.
5. Submit and wait for confirmation.

Important: wrong bank information may cause withdrawal delay or failure."""

GUIDE_BODY_WITHDRAW = """1. Open Wallet.
2. Tap Withdraw.
3. Choose the available withdrawal method.
4. Enter the amount.
5. Confirm your payment information.
6. Submit the request and wait for processing.

Please make sure all information is correct before submitting."""

GUIDE_BODY_DEPOSIT = """1. Open Wallet.
2. Tap Deposit or Recharge.
3. Choose your payment method.
4. Follow the payment instruction.
5. Upload or confirm payment proof if required.
6. Wait for balance update."""

GUIDE_BODY_LOGIN = """1. Check your account ID and password.
2. Make sure the internet connection is stable.
3. Try closing and opening the app again.
4. If the account is frozen or locked, contact official support.
5. Do not share your password with anyone."""


DEFAULT_AI_PROMPTS = [
    ("role", "Role", "You are the official mobile help center AI assistant. You must be polite, short, accurate, and customer-service focused.", 10),
    ("job", "Job", "Help customers understand FAQ, guide images, deposit, withdrawal, account, promotion, app download, and support steps. Do not perform account actions.", 20),
    ("knowledge", "Knowledge", "Use only admin-approved knowledge, FAQ, guide content, smart guide rules, and matched guide images as your source of truth.", 30),
    ("faq_prompt", "FAQ Prompt", "When an approved FAQ matches, answer using the FAQ in simple words. Do not invent policy that is not present.", 40),
    ("example_answers", "Example Answers", "Example style: 'Please check your bank card information first. Wrong information may cause withdrawal delay. You can follow the guide image below.'", 50),
    ("response_policy", "Response Policy", "Reply in 2-6 short lines when possible. Use steps for guides. Include support link when the user needs human help.", 60),
    ("language_rules", "Language Rules", "Reply in the same language as the customer when possible. Keep Burmese, English, or Chinese replies simple and respectful.", 70),
    ("safety_rules", "Safety Rules", "Never ask for password, OTP, private keys, or full bank credentials. Never confirm money was received unless verified by official backend/admin data.", 80),
    ("escalation_rules", "Escalation Rules", "Escalate to official support when the question involves frozen accounts, payment verification, missing balance, withdrawal approval, complaints, or anything not covered by approved content.", 90),
    ("image_receipt_rules", "Image / Receipt Rules", "If the customer uploads a receipt or screenshot, explain that AI can read context only. AI cannot approve deposits, withdrawals, bonuses, or account changes. Ask customer to contact official support for verification.", 100),
    ("smart_guide_rules", "Smart Guide Rules", "If matched guide images are provided, mention that the user can follow the guide image. Keep text short and do not describe images you cannot verify.", 110),
    ("fallback_reply_rules", "Fallback Reply Rules", "If no approved answer or guide is available, say you are not fully sure and provide the official support link. Do not guess.", 120),
    ("forbidden_actions", "Forbidden Actions", "Forbidden: approve payments, approve withdrawals, promise bonuses, change user account data, ask for password/OTP, claim backend verification without evidence, provide illegal or unsafe instructions, answer outside approved platform rules.", 130),
]

def seed_database(db: Session) -> None:
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")
    app_name = os.getenv("APP_NAME", "BDG Help Center")
    support_link = os.getenv("SUPPORT_LINK", "https://t.me/your_support_bot")

    if not db.query(AdminUser).filter(AdminUser.email == admin_email).first():
        db.add(AdminUser(email=admin_email, password_hash=hash_password(admin_password), role="owner"))

    if not db.query(ThemeSetting).first():
        db.add(ThemeSetting(
            app_name=app_name,
            logo_text="BDG",
            banner_title="BDG Mobile Help Center",
            banner_subtitle="Search FAQ, view guide images, or ask the AI assistant.",
            support_link=support_link,
            primary_color="#f7c948",
        ))

    if not db.query(Category).first():
        categories = [
            Category(name="Withdrawal", slug="withdrawal", description="Withdraw, bank card, and payout help", icon="💳", sort_order=10),
            Category(name="Deposit", slug="deposit", description="Recharge and payment guide", icon="💰", sort_order=20),
            Category(name="Account", slug="account", description="Login, password, and account help", icon="👤", sort_order=30),
            Category(name="Promotion", slug="promotion", description="Bonus and activity help", icon="🎁", sort_order=40),
        ]
        db.add_all(categories)
        db.flush()
        by_slug = {c.slug: c for c in categories}
        db.add_all([
            Guide(
                title="How to Bind Bank Card",
                slug=slugify("How to Bind Bank Card"),
                summary="Fill in the correct bank card information before withdrawal.",
                body=GUIDE_BODY_BANK,
                image_urls="",
                keywords="bank card, bind card, add bank, bank information, withdrawal card, payout card, wrong card",
                language="en",
                priority=10,
                status="published",
                category_id=by_slug["withdrawal"].id,
            ),
            Guide(
                title="How to Withdraw",
                slug=slugify("How to Withdraw"),
                summary="Submit withdrawal after checking your payment information.",
                body=GUIDE_BODY_WITHDRAW,
                image_urls="",
                keywords="withdraw, withdrawal, cash out, payout, money, bank, payment method",
                language="en",
                priority=20,
                status="published",
                category_id=by_slug["withdrawal"].id,
            ),
            Guide(
                title="How to Deposit",
                slug=slugify("How to Deposit"),
                summary="Choose deposit method and follow the payment instruction.",
                body=GUIDE_BODY_DEPOSIT,
                image_urls="",
                keywords="deposit, recharge, top up, payment, add money, balance",
                language="en",
                priority=30,
                status="published",
                category_id=by_slug["deposit"].id,
            ),
            Guide(
                title="Login Problem Help",
                slug=slugify("Login Problem Help"),
                summary="Check password, network, and account status first.",
                body=GUIDE_BODY_LOGIN,
                image_urls="",
                keywords="login, password, otp, account frozen, account locked, cannot open, cannot login",
                language="en",
                priority=40,
                status="published",
                category_id=by_slug["account"].id,
            ),
        ])

    if not db.query(FAQ).first():
        db.add_all([
            FAQ(question="Do I need login to use help center?", answer="No. Customers can open FAQ, guides, and AI chat without login.", keywords="login, help center, customer", priority=10, status="published"),
            FAQ(question="How can I contact support?", answer="Tap Contact Support or Official Support on the page. Use only the official support link.", keywords="support, telegram, customer service, contact", priority=20, status="published"),
            FAQ(question="Why should bank card information be correct?", answer="Wrong bank card information may cause withdrawal delay or failure. Please check carefully before submitting.", keywords="bank card, wrong bank, withdrawal failed", priority=30, status="published"),
        ])

    if not db.query(KnowledgeItem).first():
        db.add_all([
            KnowledgeItem(
                title="Safe answer rule",
                content="Only answer with approved FAQ, guide, and admin knowledge. If the question is not covered, ask the customer to contact official support.",
                keywords="fallback, unknown, support",
                priority=10,
                status="active",
            ),
            KnowledgeItem(
                title="Simple customer tone",
                content="Use short, simple, polite sentences. Give clear steps. Show matched guide images when available.",
                keywords="tone, style, reply",
                priority=20,
                status="active",
            ),
        ])


    if not db.query(AIModelSetting).first():
        db.add(AIModelSetting(
            provider="deepseek",
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_base=os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com"),
            enabled=os.getenv("AI_MODE_ENABLED", "false").lower() == "true",
            temperature=0.2,
            max_tokens=700,
            require_approved_context=True,
            memory_enabled=True,
            memory_max_messages=12,
            memory_ttl_days=30,
        ))

    existing_prompt_keys = {x.section_key for x in db.query(AIPromptSection).all()}
    for key, title, content, priority in DEFAULT_AI_PROMPTS:
        if key not in existing_prompt_keys:
            db.add(AIPromptSection(section_key=key, title=title, content=content, enabled=True, priority=priority))
    db.commit()
