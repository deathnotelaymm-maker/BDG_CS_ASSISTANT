// Mock content for BDG Help Center — preview-only. Do not use in production.

export type Settings = {
  brand: string;
  logoText: string;
  supportUrl: string;
  supportEnabled: boolean;
};

export type SiteContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  searchButtonText: string;
  popularHelpTitle: string;
  topicsTitle: string;
  featuredGuidesTitle: string;
  faqTitle: string;
  supportCtaTitle: string;
  supportCtaSubtitle: string;
  emptyStateText: string;
  errorStateText: string;
  buttons: {
    contactSupport: string;
    readGuide: string;
    viewAll: string;
  };
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
};
export type Faq = { id: string; question: string; answer: string; category?: string };
export type PopularHelp = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  link: string;
  sort: number;
  active: boolean;
};

export type GuideBlock =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "step"; title: string; text: string; image?: string }
  | { type: "note"; text: string }
  | { type: "warning"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "divider" }
  | { type: "faqRef"; faqId: string };

export type Guide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  cover: string;
  updatedAt: string;
  status: "draft" | "published" | "archived";
  priority: number;
  views?: number;
  keywords?: string[];
  blocks: GuideBlock[];
  relatedGuides?: string[];
  relatedFaqs?: string[];
  supportCta?: boolean;
};

export const settings: Settings = {
  brand: "BDG",
  logoText: "BDG Help",
  supportUrl: "/support",
  supportEnabled: true,
};

export const siteContent: SiteContent = {
  heroEyebrow: "BDG Official Help",
  heroTitle: "How can we help you today?",
  heroSubtitle: "Guides, tutorials and answers for everything BDG.",
  searchPlaceholder: "Search deposit, withdrawal, login…",
  searchButtonText: "Search",
  popularHelpTitle: "Popular help",
  topicsTitle: "Browse by topic",
  featuredGuidesTitle: "Featured guides",
  faqTitle: "Frequently asked questions",
  supportCtaTitle: "Still need help?",
  supportCtaSubtitle: "Our support team is available 24/7.",
  emptyStateText: "No results found. Try a different keyword.",
  errorStateText: "Something went wrong loading this. Please try again.",
  buttons: {
    contactSupport: "Contact support",
    readGuide: "Read guide",
    viewAll: "View all",
  },
};

export const categories: Category[] = [
  { id: "c1", slug: "deposit", name: "Deposit", icon: "Wallet", description: "Fund your account" },
  {
    id: "c2",
    slug: "withdrawal",
    name: "Withdrawal",
    icon: "Banknote",
    description: "Withdraw earnings",
  },
  {
    id: "c3",
    slug: "bank-card",
    name: "Bank Card",
    icon: "CreditCard",
    description: "Manage cards",
  },
  {
    id: "c4",
    slug: "account",
    name: "Account & Login",
    icon: "UserRound",
    description: "Login & security",
  },
  {
    id: "c5",
    slug: "getting-started",
    name: "Getting started",
    icon: "Rocket",
    description: "New user basics",
  },
  {
    id: "c6",
    slug: "promotions",
    name: "Promotions",
    icon: "Gift",
    description: "Bonuses & rewards",
  },
];

export const popularHelp: PopularHelp[] = [
  {
    id: "p1",
    title: "Deposit",
    subtitle: "Add funds to your account",
    icon: "Wallet",
    link: "/guides/how-to-deposit",
    sort: 1,
    active: true,
  },
  {
    id: "p2",
    title: "Withdrawal",
    subtitle: "Withdraw your earnings",
    icon: "Banknote",
    link: "/guides/how-to-withdraw",
    sort: 2,
    active: true,
  },
  {
    id: "p3",
    title: "Bank Card",
    subtitle: "Link and manage cards",
    icon: "CreditCard",
    link: "/guides/bank-card-setup",
    sort: 3,
    active: true,
  },
  {
    id: "p4",
    title: "Login",
    subtitle: "Sign in and recover access",
    icon: "LogIn",
    link: "/guides/login-help",
    sort: 4,
    active: true,
  },
];

export const faqs: Faq[] = [
  {
    id: "f1",
    question: "How long does a withdrawal take?",
    answer:
      "Most withdrawals complete within 5–30 minutes. Bank transfers may take up to 24 hours.",
    category: "withdrawal",
  },
  {
    id: "f2",
    question: "What is the minimum deposit?",
    answer: "The minimum deposit is ₹100 for most payment methods.",
    category: "deposit",
  },
  {
    id: "f3",
    question: "I forgot my password. What should I do?",
    answer: "Tap 'Forgot password' on the login screen and follow the SMS/email reset link.",
    category: "account",
  },
  {
    id: "f4",
    question: "Why was my card declined?",
    answer:
      "Check the card number, expiry and CVV. If issue persists, contact your bank or try another card.",
    category: "bank-card",
  },
  {
    id: "f5",
    question: "How do I claim a bonus?",
    answer: "Visit Promotions in your account and tap 'Claim' on any eligible offer.",
    category: "promotions",
  },
];

const img = (seed: string, w = 1200, h = 600) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const guides: Guide[] = [
  {
    id: "g1",
    slug: "how-to-deposit",
    title: "How to make your first deposit",
    summary: "Step-by-step: fund your BDG account securely in under a minute.",
    category: "deposit",
    cover: img("1556742049-0cfed4f6a45d"),
    updatedAt: "2026-06-15",
    status: "published",
    priority: 1,
    views: 12480,
    keywords: ["deposit", "add funds", "payment"],
    supportCta: true,
    blocks: [
      {
        type: "paragraph",
        text: "Adding funds to your BDG account takes about a minute. Follow the steps below and you'll be ready to play or trade in no time.",
      },
      {
        type: "step",
        title: "Step 1 — Open your wallet",
        text: "Tap the Wallet icon in the bottom navigation of the BDG app.",
        image: img("1563986768609-322da13575f3", 800, 500),
      },
      {
        type: "step",
        title: "Step 2 — Choose Deposit",
        text: "Select 'Deposit', then pick your preferred payment method: UPI, bank card, or net banking.",
      },
      {
        type: "step",
        title: "Step 3 — Enter amount",
        text: "Enter the amount (minimum ₹100). Review any applicable bonus and tap Continue.",
      },
      {
        type: "note",
        text: "Deposits are typically credited instantly. Bank transfers may take up to 10 minutes.",
      },
      {
        type: "step",
        title: "Step 4 — Complete payment",
        text: "Authorise the payment in your bank or UPI app. You'll receive a confirmation once complete.",
      },
      {
        type: "warning",
        text: "Never share your OTP or PIN with anyone claiming to be from BDG support.",
      },
      { type: "heading", text: "Common issues", level: 2 },
      {
        type: "paragraph",
        text: "If your deposit doesn't show up within 10 minutes, check your bank statement first — money is rarely lost, only delayed.",
      },
    ],
    relatedGuides: ["how-to-withdraw", "bank-card-setup"],
    relatedFaqs: ["f2", "f4"],
  },
  {
    id: "g2",
    slug: "how-to-withdraw",
    title: "How to withdraw your winnings",
    summary: "Cash out to your bank account or UPI in minutes.",
    category: "withdrawal",
    cover: img("1554224155-6726b3ff858f"),
    updatedAt: "2026-06-20",
    status: "published",
    priority: 2,
    views: 9854,
    supportCta: true,
    blocks: [
      {
        type: "paragraph",
        text: "Withdrawals are fast, secure and available 24/7. Make sure your KYC is verified before your first withdrawal.",
      },
      { type: "step", title: "Step 1 — Open Wallet", text: "Open the BDG app and tap Wallet." },
      {
        type: "step",
        title: "Step 2 — Choose Withdraw",
        text: "Tap Withdraw and pick a saved bank account or UPI ID.",
      },
      {
        type: "step",
        title: "Step 3 — Enter amount",
        text: "Enter the amount you want to withdraw. Minimum ₹200.",
      },
      {
        type: "note",
        text: "First-time withdrawals require KYC verification. This is a one-time process.",
      },
      {
        type: "step",
        title: "Step 4 — Confirm",
        text: "Confirm with your PIN. The funds will arrive within 5–30 minutes.",
      },
    ],
    relatedGuides: ["how-to-deposit", "bank-card-setup"],
    relatedFaqs: ["f1"],
  },
  {
    id: "g3",
    slug: "bank-card-setup",
    title: "Add and manage bank cards",
    summary: "Link a debit or credit card for faster deposits and payouts.",
    category: "bank-card",
    cover: img("1580048915913-4f3b1629dd98"),
    updatedAt: "2026-05-30",
    status: "published",
    priority: 3,
    views: 6220,
    blocks: [
      {
        type: "paragraph",
        text: "Save your card once and skip re-entering details on every transaction.",
      },
      {
        type: "step",
        title: "Step 1 — Open Account settings",
        text: "Go to Profile → Payment methods.",
      },
      {
        type: "step",
        title: "Step 2 — Add card",
        text: "Tap 'Add card' and enter card number, expiry and CVV.",
      },
      {
        type: "warning",
        text: "Only save cards on trusted devices. Never share your card details over chat.",
      },
    ],
    relatedGuides: ["how-to-deposit"],
    relatedFaqs: ["f4"],
  },
  {
    id: "g4",
    slug: "login-help",
    title: "Login problems and account recovery",
    summary: "Reset your password, recover access, and secure your account.",
    category: "account",
    cover: img("1633265486064-086b219458ec"),
    updatedAt: "2026-07-01",
    status: "published",
    priority: 4,
    views: 4310,
    blocks: [
      {
        type: "paragraph",
        text: "Trouble signing in? Follow these steps to get back into your account quickly.",
      },
      {
        type: "step",
        title: "Step 1 — Try 'Forgot password'",
        text: "On the login screen tap 'Forgot password' and enter your registered mobile number.",
      },
      {
        type: "step",
        title: "Step 2 — Enter OTP",
        text: "You'll get an SMS with a 6-digit code. Enter it in the app.",
      },
      {
        type: "note",
        text: "OTPs expire after 10 minutes. Request a new one if it stops working.",
      },
    ],
    relatedFaqs: ["f3"],
  },
  {
    id: "g5",
    slug: "getting-started",
    title: "Getting started with BDG",
    summary: "A quick tour of the app and how to set up your profile.",
    category: "getting-started",
    cover: img("1522202176988-66273c2fd55f"),
    updatedAt: "2026-04-11",
    status: "published",
    priority: 5,
    views: 3105,
    blocks: [
      {
        type: "paragraph",
        text: "Welcome to BDG. Here's everything you need to make the most of your first session.",
      },
      { type: "heading", text: "1. Create your profile" },
      { type: "paragraph", text: "Add your name and a photo so friends can find you." },
    ],
  },
  {
    id: "g6",
    slug: "kyc-verification",
    title: "Complete KYC verification",
    summary: "Upload your documents and unlock full withdrawals.",
    category: "account",
    cover: img("1618044733300-9472054094ee"),
    updatedAt: "2026-06-05",
    status: "published",
    priority: 6,
    views: 2870,
    blocks: [
      { type: "paragraph", text: "KYC is a one-time process required by regulation." },
      { type: "step", title: "Step 1 — Take a selfie", text: "Well-lit, no glasses, no filters." },
      { type: "step", title: "Step 2 — Upload ID", text: "PAN or Aadhaar, clearly readable." },
    ],
  },
];

export function filterGuides(params?: { category?: string; q?: string }) {
  let list = guides.filter((g) => g.status === "published");
  if (params?.category) list = list.filter((g) => g.category === params.category);
  if (params?.q) {
    const q = params.q.toLowerCase();
    list = list.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        (g.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
    );
  }
  return list;
}

export function findGuide(slugOrId: string) {
  return guides.find((g) => g.slug === slugOrId || g.id === slugOrId) ?? null;
}
