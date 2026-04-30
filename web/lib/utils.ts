import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const EPIC_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4",
  "#a855f7", "#84cc16", "#f97316", "#14b8a6", "#ef4444",
];

export function epicColor(epicId: string, idx: number): string {
  return EPIC_PALETTE[idx % EPIC_PALETTE.length];
}
