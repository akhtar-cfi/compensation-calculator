#!/usr/bin/env node
// Stands in for poppler's pdftotext in tests: the "PDF" is plain text, printed as is.
import { readFileSync } from "node:fs";
import { argv, exit, stderr, stdout } from "node:process";
const text = readFileSync(argv[argv.length - 2], "utf8");
// a "PDF" starting BROKEN stands for a damaged file: fail the way poppler does
if (text.startsWith("BROKEN")) {
  stderr.write("Syntax Error: Couldn't read xref table\n");
  exit(1);
}
stdout.write(text);
