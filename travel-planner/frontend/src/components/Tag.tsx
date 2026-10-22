import type { ReactNode } from "react";
export default function Tag({
  children,
  tone = "sage",
}: {
  children: ReactNode;
  tone?: "sage" | "peach" | "neutral";
}) {
  return <span className={`chip ${tone}`}>{children}</span>;
}
