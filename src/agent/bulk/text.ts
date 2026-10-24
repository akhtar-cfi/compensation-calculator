import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * PDF to plain text with poppler's pdftotext (-layout keeps award tables aligned). This text is
 * what extractions quote and the verifier checks. Scanned PDFs give little or no text: `wordCount`
 * below MIN_WORDS marks them, and they are skipped and logged rather than guessed at.
 */
export const MIN_WORDS = 150;

export async function pdfToText(pdf: ArrayBuffer, bin = "pdftotext"): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "mact-pdf-"));
  try {
    const file = join(dir, "in.pdf");
    writeFileSync(file, Buffer.from(pdf));
    const { stdout } = await run(bin, ["-layout", "-enc", "UTF-8", file, "-"], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout.replace(/\f/g, "\n").replace(/[ \t]+$/gm, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const wordCount = (text: string): number => (text.match(/[A-Za-z]{2,}/g) ?? []).length;
