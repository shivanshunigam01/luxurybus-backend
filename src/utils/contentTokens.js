export const applyTokens = (template, tokens = {}) => {
  let out = String(template || '');
  for (const [key, value] of Object.entries(tokens)) {
    out = out.replaceAll(`{${key}}`, String(value ?? ''));
  }
  return out.replace(/\s+/g, ' ').trim();
};

export const countWords = (text = '') =>
  String(text)
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

export const hashContent = (text = '') => {
  let h = 0;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `h${Math.abs(h)}`;
};

export const extractToc = (htmlOrMd = '') => {
  const toc = [];
  const re = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(String(htmlOrMd)))) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (!text) continue;
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    toc.push({ id, text, level: Number(m[1]) });
  }
  return toc;
};

export const anchorVariant = (seed, variants) => {
  if (!variants?.length) return '';
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return variants[Math.abs(h) % variants.length];
};
