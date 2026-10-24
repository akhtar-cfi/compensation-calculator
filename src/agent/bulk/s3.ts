/**
 * Read-only access to the two public judgment buckets on AWS Open Data (no account, no SDK):
 * - indian-high-court-judgments (25 High Courts; maintained by Dattam Labs; CC-BY-4.0)
 * - indian-supreme-court-judgments (Supreme Court, 1950 on; same maintainer; CC-BY-4.0)
 * Both are in ap-south-1 and answer plain HTTPS GETs, including ListObjectsV2.
 */
export const BUCKETS = {
  hc: "indian-high-court-judgments",
  sc: "indian-supreme-court-judgments",
} as const;
export type BucketId = keyof typeof BUCKETS;

export type HttpFetch = (url: string) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const defaultFetch: HttpFetch = (url) => fetch(url);

export const objectUrl = (bucket: BucketId, key: string): string =>
  `https://${BUCKETS[bucket]}.s3.ap-south-1.amazonaws.com/${key.split("/").map(encodeURIComponent).join("/")}`;

export interface S3Object {
  key: string;
  size: number;
}

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
const tagValues = (xml: string, tag: string): string[] =>
  [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => unescapeXml(m[1]!));

/** One page of a ListObjectsV2 response: objects, sub-folders (with a delimiter) and the next token. */
export function parseListing(xml: string): { objects: S3Object[]; prefixes: string[]; next?: string } {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((m) => ({
    key: tagValues(m[1]!, "Key")[0] ?? "",
    size: Number(tagValues(m[1]!, "Size")[0] ?? 0),
  }));
  const prefixes = [...xml.matchAll(/<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g)].map(
    (m) => tagValues(m[1]!, "Prefix")[0] ?? "",
  );
  const truncated = tagValues(xml, "IsTruncated")[0] === "true";
  const next = truncated ? tagValues(xml, "NextContinuationToken")[0] : undefined;
  return { objects, prefixes, ...(next && { next }) };
}

/** Every object (and, with a delimiter, every sub-folder) under a prefix, following continuation tokens. */
export async function listAll(
  bucket: BucketId,
  prefix: string,
  opts: { delimiter?: string; fetch?: HttpFetch; maxPages?: number } = {},
): Promise<{ objects: S3Object[]; prefixes: string[] }> {
  const get = opts.fetch ?? defaultFetch;
  const objects: S3Object[] = [];
  const prefixes: string[] = [];
  let token: string | undefined;
  for (let page = 0; page < (opts.maxPages ?? 1000); page++) {
    const q = new URLSearchParams({ "list-type": "2", prefix });
    if (opts.delimiter) q.set("delimiter", opts.delimiter);
    if (token) q.set("continuation-token", token);
    const res = await get(`https://${BUCKETS[bucket]}.s3.ap-south-1.amazonaws.com/?${q}`);
    if (!res.ok) throw new Error(`listing ${bucket}/${prefix} failed: HTTP ${res.status}`);
    const p = parseListing(await res.text());
    objects.push(...p.objects);
    prefixes.push(...p.prefixes);
    if (!p.next) break;
    token = p.next;
  }
  return { objects, prefixes };
}

/** The object's bytes; undefined when it does not exist (404/403, as S3 answers for a missing public key). */
export async function getObject(
  bucket: BucketId,
  key: string,
  fetchFn: HttpFetch = defaultFetch,
): Promise<ArrayBuffer | undefined> {
  const res = await fetchFn(objectUrl(bucket, key));
  if (res.status === 404 || res.status === 403) return undefined;
  if (!res.ok) throw new Error(`fetching ${bucket}/${key} failed: HTTP ${res.status}`);
  return res.arrayBuffer();
}
