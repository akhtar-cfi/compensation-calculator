#!/usr/bin/env node
// Stands in for poppler's pdftotext in tests: the "PDF" is plain text, printed as is.
import { readFileSync } from "node:fs";
import { argv, stdout } from "node:process";
stdout.write(readFileSync(argv[argv.length - 2], "utf8"));
