import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ServiceErrorPanel({
  onRetry,
  language = "en",
  compact = false,
}: {
  onRetry: () => void;
  language?: "en" | "hi";
  compact?: boolean;
}) {
  const copy = language === "hi"
    ? {
        title: "गाइड सेवा से कनेक्ट नहीं हो सका",
        body: "आपकी प्रकाशित सामग्री सुरक्षित है। कृपया दोबारा प्रयास करें।",
        retry: "फिर कोशिश करें",
      }
    : {
        title: "Unable to connect to the guide service",
        body: "Your published content is still safe. Please try again.",
        retry: "Try again",
      };

  return (
    <div className={`rounded-2xl border border-destructive/25 bg-destructive/5 ${compact ? "p-4" : "p-5"}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{copy.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> {copy.retry}
          </Button>
        </div>
      </div>
    </div>
  );
}
