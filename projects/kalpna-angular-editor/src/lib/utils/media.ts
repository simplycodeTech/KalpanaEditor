/** Media embed providers (CKEditor "media embed" equivalent). */
export interface KalpnaMediaInfo {
  provider: string;
  embedUrl: string;
  /** Height / width ratio in percent for responsive wrappers (e.g. 56.25 for 16:9). */
  ratio: number;
  /** Fixed height for non-video players (e.g. Spotify). */
  fixedHeight?: number;
}

/** Convert a page URL (YouTube, Vimeo, …) into a safe embed player URL. Returns null if unsupported. */
export function parseMediaUrl(raw: string): KalpnaMediaInfo | null {
  const url = (raw || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    if (/^(www\.)?[\w-]+\.[\w.]+\//i.test(url)) return parseMediaUrl('https://' + url);
    return null;
  }
  let m: RegExpMatchArray | null;

  // YouTube
  m = url.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})(?:[?&#](?:.*?[?&])?t=(\d+)s?)?/i);
  if (m) {
    const start = m[2] ? `?start=${m[2]}` : '';
    return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${m[1]}${start}`, ratio: 56.25 };
  }
  // Vimeo
  m = url.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)/i);
  if (m) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}`, ratio: 56.25 };
  // Dailymotion
  m = url.match(/^https?:\/\/(?:www\.)?(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-z0-9]+)/i);
  if (m) return { provider: 'dailymotion', embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}`, ratio: 56.25 };
  // Spotify
  m = url.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[\w-]+\/)?(?:embed\/)?(track|album|playlist|artist|episode|show)\/(\w+)/i);
  if (m) {
    const tall = m[1] !== 'track' && m[1] !== 'episode';
    return { provider: 'spotify', embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, ratio: 0, fixedHeight: tall ? 380 : 152 };
  }
  // Google Maps (embed URLs, or any maps URL → search embed)
  m = url.match(/^https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/embed\?(.+)$/i);
  if (m) return { provider: 'googlemaps', embedUrl: `https://www.google.com/maps/embed?${m[1]}`, ratio: 75 };
  m = url.match(/^https?:\/\/(?:www\.|maps\.)?google\.[a-z.]+\/maps(?:\/place\/([^/@?]+))?.*?(?:@(-?[\d.]+),(-?[\d.]+))?/i);
  if (m && /google\.[a-z.]+\/maps/i.test(url)) {
    const q = m[1] ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : m[2] ? `${m[2]},${m[3]}` : '';
    if (q) return { provider: 'googlemaps', embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`, ratio: 75 };
  }
  // Facebook video
  if (/^https?:\/\/(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/.+/i.test(url) && /(videos?|watch|reel)/i.test(url)) {
    return { provider: 'facebook', embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, ratio: 56.25 };
  }
  // SoundCloud
  if (/^https?:\/\/(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i.test(url)) {
    return { provider: 'soundcloud', embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`, ratio: 0, fixedHeight: 166 };
  }
  return null;
}

/** Build the embed HTML for a media URL (sanitizer-compatible). */
export function buildMediaHtml(originalUrl: string, info: KalpnaMediaInfo): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const wrapperStyle = info.fixedHeight
    ? `position: relative; height: ${info.fixedHeight}px`
    : `position: relative; padding-bottom: ${info.ratio}%; height: 0`;
  const iframeStyle = info.fixedHeight
    ? 'width: 100%; height: 100%; border: 0'
    : 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0';
  return (
    `<figure class="media" contenteditable="false">` +
    `<div class="kalpna-media" data-oembed-url="${esc(originalUrl)}" style="${wrapperStyle}">` +
    `<iframe src="${esc(info.embedUrl)}" style="${iframeStyle}" frameborder="0" ` +
    `allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowfullscreen loading="lazy" ` +
    `referrerpolicy="strict-origin-when-cross-origin" title="${esc(info.provider)} media"></iframe>` +
    `</div></figure>`
  );
}
