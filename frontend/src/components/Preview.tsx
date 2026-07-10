"use client";

export function Preview({
  doc,
  iframeRef,
}: {
  doc: string;
  /** Exposes the preview iframe (for scroll-sync). */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  return (
    <div className="min-h-0 flex-1 bg-muted/70">
      <iframe
        ref={iframeRef}
        className="block size-full border-0 bg-muted/70"
        title="预览"
        srcDoc={doc}
        // No allow-scripts: the rendered doc is our own sanitized HTML.
        sandbox="allow-same-origin"
      />
    </div>
  );
}
