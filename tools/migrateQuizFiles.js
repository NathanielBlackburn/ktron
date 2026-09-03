#!/usr/bin/env node
/**
 * Migrates js/quizFiles.js from the 3.1.x form:
 *   const ktronQuizFiles = ["code"];
 * to the 3.2 form required for file:// / script-tag loading:
 *   window.ktronQuizFiles = ["code"];
 *
 * Usage: npm run migrate-quiz-files
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUIZ_FILES_PATH = path.join(ROOT, 'js', 'quizFiles.js');

const parseCodes = (text) => {
	const windowAssign = text.match(/window\.ktronQuizFiles\s*=\s*(\[[\s\S]*?\])\s*;/);
	if (windowAssign) {
		return { codes: JSON.parse(windowAssign[1]), format: 'window' };
	}
	const exported = text.match(/(?:export\s+)?const\s+ktronQuizFiles\s*=\s*(\[[\s\S]*?\])\s*;/);
	if (exported) {
		return { codes: JSON.parse(exported[1]), format: 'const' };
	}
	const legacy = text.match(/\[[\s\S]*\]/);
	if (legacy) {
		return { codes: JSON.parse(legacy[0]), format: 'legacy' };
	}
	return { codes: null, format: 'unknown' };
};

const main = () => {
	if (!fs.existsSync(QUIZ_FILES_PATH)) {
		console.log(`Brak pliku ${path.relative(ROOT, QUIZ_FILES_PATH)} — nic do zrobienia.`);
		process.exit(0);
	}

	const text = fs.readFileSync(QUIZ_FILES_PATH, 'utf8');
	let parsed;
	try {
		parsed = parseCodes(text);
	} catch (error) {
		console.error(`Nie udało się odczytać listy konkursów z ${path.relative(ROOT, QUIZ_FILES_PATH)}:`);
		console.error(error.message);
		process.exit(1);
	}

	if (parsed.codes === null) {
		console.error(`Nie rozpoznano formatu pliku ${path.relative(ROOT, QUIZ_FILES_PATH)}.`);
		process.exit(1);
	}

	if (parsed.format === 'window') {
		console.log(`Plik ${path.relative(ROOT, QUIZ_FILES_PATH)} jest już w formacie 3.2 (window.ktronQuizFiles).`);
		console.log(`Konkursy: ${JSON.stringify(parsed.codes)}`);
		process.exit(0);
	}

	const next = `window.ktronQuizFiles = ${JSON.stringify(parsed.codes)};\n`;
	fs.writeFileSync(QUIZ_FILES_PATH, next);
	console.log(`Zmigrowano ${path.relative(ROOT, QUIZ_FILES_PATH)} (${parsed.format} → window).`);
	console.log(`Konkursy: ${JSON.stringify(parsed.codes)}`);
};

main();
