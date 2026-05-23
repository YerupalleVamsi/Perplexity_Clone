export function TypingIndicator() {
  return (
    <span
      className="inline-flex items-center gap-3 py-1 align-middle"
      aria-label="Generating answer"
    >
      <span className="inline-flex items-end gap-[5px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block size-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "wave-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 160}ms`,
            }}
          />
        ))}
      </span>
      <span
        className="text-[13px] text-muted-foreground"
        style={{ animation: "fade-in 0.25s ease both" }}
      >
        Thinking...
      </span>
    </span>
  );
}
