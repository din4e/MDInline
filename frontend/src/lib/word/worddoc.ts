/**
 * Legacy `.doc` via the "Word HTML" technique: the already-inlined HTML
 * (every element carries its `style=""`) is wrapped in a Microsoft-Office XML
 * header and saved with a `.doc` extension. Word/WPS open it as a Word
 * document and render the inline styles essentially as in the preview.
 *
 * Zero dependencies, no IR — reuses `render().inlined` directly.
 *
 * Trade-off: stricter Word configs may show a one-time "format/extension
 * mismatch" prompt on first open (click Yes); WPS and most Word setups don't.
 */
export function buildWordDoc(inlined: string): string {
  return (
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    "<head>" +
    '<meta http-equiv=Content-Type content="text/html; charset=utf-8">' +
    '<meta name=ProgId content="Word.Document">' +
    '<meta name=Generator content="MDInline">' +
    '<meta name=Originator content="MDInline">' +
    "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->" +
    "<style>" +
    "@page WordSection1{size:595.3pt 841.9pt;margin:72.0pt 72.0pt 72.0pt 72.0pt;}" +
    "div.WordSection1{page:WordSection1;}" +
    "</style>" +
    "</head>" +
    "<body>" +
    '<div class=WordSection1>' +
    inlined +
    "</div>" +
    "</body>" +
    "</html>"
  );
}
