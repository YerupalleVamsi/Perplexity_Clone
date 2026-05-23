import { useState } from "react";
import { ExternalLink, Globe, ImageIcon } from "lucide-react";
import type { Source } from "@/lib/api";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconFallback(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "";
  }
}

function SourceImage({ source }: { source: Source }) {
  const [imgError, setImgError] = useState(false);
  const favicon = source.favicon || faviconFallback(source.url);
  const host = hostname(source.url);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block w-[176px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-colors hover:border-ring/50"
      title={source.title || host}
    >
      <div className="aspect-[4/3] w-full">
        {source.image && !imgError ? (
          <img
            src={source.image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            {favicon ? (
              <img
                src={favicon}
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-md opacity-80"
                loading="lazy"
              />
            ) : (
              <ImageIcon className="size-7 text-muted-foreground/55" />
            )}
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
        <p className="truncate text-[12px] font-medium text-white">{host}</p>
      </div>
    </a>
  );
}

function SourceLink({ source, index }: { source: Source; index: number }) {
  const favicon = source.favicon || faviconFallback(source.url);
  const host = hostname(source.url);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-w-0 gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm transition-colors hover:border-ring/50 hover:bg-accent/35"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-[12px] font-medium text-muted-foreground">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          {favicon ? (
            <img
              src={favicon}
              alt=""
              width={14}
              height={14}
              className="size-3.5 shrink-0 rounded-sm"
              loading="lazy"
            />
          ) : (
            <Globe className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{host}</span>
        </span>
        <span className="line-clamp-2 text-[14px] font-medium leading-5 text-foreground">
          {source.title || host}
        </span>
        {source.snippet && (
          <span className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
            {source.snippet}
          </span>
        )}
      </span>
      <ExternalLink className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

type Props = {
  sources: Source[];
};

export function SourceLinks({ sources }: Props) {
  if (!sources.length) return null;

  const imageSources = sources.filter((source) => source.image);

  return (
    <section className="space-y-4" aria-label="Sources">
      {imageSources.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[12px] font-medium uppercase text-muted-foreground">
              Images
            </h3>
            <span className="text-[12px] text-muted-foreground">
              From search
            </span>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory scrollbar-thin">
            {imageSources.slice(0, 8).map((source) => (
              <div key={`image-${source.url}`} className="snap-start">
                <SourceImage source={source} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[12px] font-medium uppercase text-muted-foreground">
            Links
          </h3>
          <span className="text-[12px] text-muted-foreground">
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.slice(0, 6).map((source, index) => (
            <SourceLink
              key={`${source.url}-${index}`}
              source={source}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
