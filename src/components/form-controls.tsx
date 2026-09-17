import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/cn";

const base =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 " +
  "placeholder:text-slate-400 outline-none transition-colors " +
  "focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20";

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-9", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "resize-none leading-relaxed", className)} {...props} />;
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-slate-700">
      {children}
    </label>
  );
}
