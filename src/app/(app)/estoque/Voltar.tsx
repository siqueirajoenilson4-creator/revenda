import Link from "next/link";
import { Icone, VOLTAR } from "@/components/IconesItem";

export function Voltar({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 mb-1 inline-flex min-h-11 max-w-full items-center gap-1 rounded-lg pr-3 pl-1.5 text-sm font-semibold text-suave transition-colors hover:bg-superficie hover:text-texto md:min-h-9"
    >
      <Icone>{VOLTAR}</Icone>
      <span className="truncate">{children}</span>
    </Link>
  );
}
