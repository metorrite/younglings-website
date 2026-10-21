import { parseMarkdown, type Inline } from "@/lib/miniMarkdown";

/** A clan's text block, from the small Markdown subset (lib/miniMarkdown). Everything is rendered as React text; no HTML is ever inserted. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "heading") {
          const Tag = (["h2", "h3", "h4"] as const)[block.level - 1];
          const size = block.level === 1 ? "text-2xl" : block.level === 2 ? "text-xl" : "text-lg";
          return (
            <Tag key={i} className={`${size} font-semibold`}>
              <Inlines nodes={block.children} />
            </Tag>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={i} className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-6`}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inlines nodes={item} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            <Inlines nodes={block.children} />
          </p>
        );
      })}
    </div>
  );
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "text") return <span key={i}>{n.text}</span>;
        if (n.type === "bold") return <strong key={i}><Inlines nodes={n.children} /></strong>;
        if (n.type === "italic") return <em key={i}><Inlines nodes={n.children} /></em>;
        return (
          <a key={i} href={n.href} rel="nofollow noopener noreferrer" target="_blank" className="underline decoration-[var(--cs-primary)] underline-offset-2 hover:text-[var(--cs-primary)]">
            <Inlines nodes={n.children} />
          </a>
        );
      })}
    </>
  );
}
