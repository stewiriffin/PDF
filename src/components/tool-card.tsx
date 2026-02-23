import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color?: string;
}

export function ToolCard({
  title,
  description,
  icon: Icon,
  href,
  color = "bg-primary",
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
            color
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-card-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
    </Link>
  );
}
