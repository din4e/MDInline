"use client";

export function Preview({ doc }: { doc: string }) {
  return (
    <div className="min-h-0 flex-1 bg-muted/70">
      <iframe
        className="block size-full border-0 bg-muted/70"
        title="预览"
        srcDoc={doc}
        // No allow-scripts: the rendered doc is our own sanitized HTML.
        sandbox="allow-same-origin"
      />
    </div>
  );
}
