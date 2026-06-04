import { readFileSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templateHtml = resolve(root, 'template/konkursotron-template.html');
const builtPath = resolve(root, 'dist/template/konkursotron-template.html');
const outputPath = resolve(root, 'konkursotron.html');

const built = readFileSync(builtPath, 'utf8');
const template = readFileSync(templateHtml, 'utf8');

const assetTags = [
	...built.matchAll(/<script\b[^>]*>\s*<\/script>/gi),
	...built.matchAll(/<link\b[^>]*>/gi),
]
	.map((match) => match[0])
	.map((tag) => tag
		.replace(/(?:\.\.\/|\.\/)assets\//g, './dist/assets/')
		.replace(/\s+crossorigin(?:="[^"]*")?/gi, '')
		.replace(/\s+type="module"/gi, ' type="text/javascript"'))
	.join('\n    ');

if (!assetTags.length) {
	throw new Error('postbuild: no script/link asset tags found in dist/template/konkursotron-template.html');
}

const bodyMatch = template.match(/<body>([\s\S]*?)<\/body>/i);
if (!bodyMatch) {
	throw new Error('postbuild: could not parse <body> from template/konkursotron-template.html');
}

const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
    ${assetTags}
	<title></title>
</head>
<body>${bodyMatch[1]}
</body>
</html>
`;

writeFileSync(outputPath, html);
console.log('Wrote', outputPath, '(file://-ready, loads ./dist/assets/)');

for (const path of [
	resolve(root, 'dist/template'),
	resolve(root, 'dist/.vite'),
]) {
	rmSync(path, { recursive: true, force: true });
	console.log('Removed', path.replace(root + '/', ''));
}
