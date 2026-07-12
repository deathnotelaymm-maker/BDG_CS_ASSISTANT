import type { GuideBlock } from "@/mock/data";
import { useState } from "react";
import {
  Heading2,
  Type,
  Image as ImageIcon,
  ListOrdered,
  Info,
  AlertTriangle,
  Link2,
  Minus,
  HelpCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  value: GuideBlock[];
  onChange: (blocks: GuideBlock[]) => void;
};

const BLOCK_TYPES: { type: GuideBlock["type"]; label: string; icon: React.ComponentType<any> }[] = [
  { type: "heading", label: "Heading", icon: Heading2 },
  { type: "paragraph", label: "Paragraph", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "step", label: "Step", icon: ListOrdered },
  { type: "note", label: "Note", icon: Info },
  { type: "warning", label: "Warning", icon: AlertTriangle },
  { type: "button", label: "Button", icon: Link2 },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "faqRef", label: "FAQ ref", icon: HelpCircle },
];

function empty(t: GuideBlock["type"]): GuideBlock {
  switch (t) {
    case "heading": return { type: "heading", text: "New heading", level: 2 };
    case "paragraph": return { type: "paragraph", text: "" };
    case "image": return { type: "image", url: "" };
    case "step": return { type: "step", title: "Step title", text: "" };
    case "note": return { type: "note", text: "" };
    case "warning": return { type: "warning", text: "" };
    case "button": return { type: "button", label: "Learn more", url: "" };
    case "divider": return { type: "divider" };
    case "faqRef": return { type: "faqRef", faqId: "" };
  }
}

export function BlockEditor({ value, onChange }: Props) {
  const [picker, setPicker] = useState(false);

  const update = (i: number, next: GuideBlock) => {
    const copy = value.slice();
    copy[i] = next;
    onChange(copy);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const copy = value.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  const add = (t: GuideBlock["type"]) => {
    onChange([...value, empty(t)]);
    setPicker(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1.5">
        {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-card"
            title={`Insert ${label}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {value.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Add your first block from the toolbar above.
          </div>
        )}
        {value.map((b, i) => (
          <BlockRow
            key={i}
            block={b}
            onChange={(next) => update(i, next)}
            onDelete={() => remove(i)}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={() => setPicker((p) => !p)} type="button">
          <Plus className="mr-1 h-3.5 w-3.5" /> Add block
        </Button>
      </div>
      {picker && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border p-2 md:grid-cols-5">
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => add(type)}
              className="flex flex-col items-center gap-1 rounded-md border border-border p-2 text-xs hover:bg-muted"
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockRow({
  block,
  onChange,
  onDelete,
  onUp,
  onDown,
}: {
  block: GuideBlock;
  onChange: (b: GuideBlock) => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {block.type}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton onClick={onUp} title="Move up"><ChevronUp className="h-3.5 w-3.5" /></IconButton>
          <IconButton onClick={onDown} title="Move down"><ChevronDown className="h-3.5 w-3.5" /></IconButton>
          <IconButton onClick={onDelete} title="Delete" danger><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} />
    </div>
  );
}

function IconButton({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted",
        danger && "hover:border-destructive hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

function BlockFields({ block, onChange }: { block: GuideBlock; onChange: (b: GuideBlock) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="flex gap-2">
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={block.level ?? 2}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
        </div>
      );
    case "paragraph":
      return <Textarea rows={3} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />;
    case "image":
      return (
        <div className="space-y-2">
          <Input placeholder="Image URL" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
          <Input placeholder="Alt text" value={block.alt ?? ""} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <Input placeholder="Caption (optional)" value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
          {block.url && <img src={block.url} alt="" className="max-h-40 rounded border border-border" />}
        </div>
      );
    case "step":
      return (
        <div className="space-y-2">
          <Input placeholder="Step title" value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <Textarea rows={3} placeholder="Step description" value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
          <Input placeholder="Optional image URL" value={block.image ?? ""} onChange={(e) => onChange({ ...block, image: e.target.value })} />
        </div>
      );
    case "note":
    case "warning":
      return <Textarea rows={2} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />;
    case "button":
      return (
        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Label" value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
          <Input placeholder="URL" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
        </div>
      );
    case "divider":
      return <div className="text-xs text-muted-foreground">Visual separator</div>;
    case "faqRef":
      return <Input placeholder="FAQ id" value={block.faqId} onChange={(e) => onChange({ ...block, faqId: e.target.value })} />;
  }
}