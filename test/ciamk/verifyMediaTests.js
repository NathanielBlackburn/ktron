import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	attachCoverAlt,
	attachQuestionAlt,
	findAltImagePath,
	getAltImageCandidates,
	getBaseFileNameFromAlt,
	isAccountedAltFile,
} from '../../tools/ciamk.js';

console.log('Case 1: Alt filenames map back to their base file.');

console.assert(getBaseFileNameFromAlt('101-alt.png') === '101.png', 'Question alt image should map to base image.');
console.assert(getBaseFileNameFromAlt('69a-alt.webp') === '69a.webp', 'Answer alt image should map to base image.');
console.assert(getBaseFileNameFromAlt('lit-a-alt.png') === 'lit-a.png', 'Category cover alt image should map to base image.');
console.assert(getBaseFileNameFromAlt('101.png') === null, 'Base image should not be treated as alt.');
console.assert(getBaseFileNameFromAlt('random-alt-extra.png') === null, 'Only filenames ending with -alt should be treated as alt versions.');

console.log('Case 2: Accounted alt files are excluded from redundancy checks.');

const foundFiles = ['101.png', '042a.jpg', 'geo.png'];
console.assert(isAccountedAltFile('101-alt.png', foundFiles), 'Alt of accounted question image should be accepted.');
console.assert(isAccountedAltFile('042a-alt.jpg', foundFiles), 'Alt of accounted answer image should be accepted.');
console.assert(isAccountedAltFile('geo-alt.png', foundFiles), 'Alt of accounted cover image should be accepted.');
console.assert(isAccountedAltFile('101-alt.webp', foundFiles), 'Alt with a different extension than the base should still be accounted.');
console.assert(!isAccountedAltFile('999-alt.png', foundFiles), 'Alt without accounted base should stay redundant.');
console.assert(!isAccountedAltFile('101.png', foundFiles), 'Base file itself is not an alt file.');

console.log('Case 3: Alt candidates keep the base stem and try image extensions.');

{
	const candidates = getAltImageCandidates('001.png');
	console.assert(candidates.includes('001-alt.webp'), 'Alt candidates should include a different image extension.');
	console.assert(candidates.includes('001-alt.png'), 'Alt candidates should include the original image extension.');
	console.assert(!candidates.some((name) => name.includes('001a-alt')), 'Question alt candidates should not use the answer suffix.');
}

console.log('Case 4: Ciamk attaches alt types from files with a different extension.');

{
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktron-alt-'));
	try {
		fs.writeFileSync(path.join(dir, '001.png'), '');
		fs.writeFileSync(path.join(dir, '001-alt.webp'), '');
		fs.writeFileSync(path.join(dir, '042a.jpg'), '');
		fs.writeFileSync(path.join(dir, '042a-alt.png'), '');
		fs.writeFileSync(path.join(dir, 'geo.png'), '');
		fs.writeFileSync(path.join(dir, 'geo-alt.webp'), '');

		const foundQuestionAlt = findAltImagePath(dir, '001.png');
		console.assert(path.basename(foundQuestionAlt) === '001-alt.webp', 'Question alt should be found even with a different extension.');

		const question = { id: '001' };
		const questionAltName = attachQuestionAlt(dir, question, 'question', '001.png');
		console.assert(question.questionTypeAlt === 'webp', 'questionTypeAlt should store the alt image extension.');
		console.assert(questionAltName === '001-alt.webp', 'Question alt filename should be returned.');

		const answer = { id: '042' };
		const answerAltName = attachQuestionAlt(dir, answer, 'answer', '042a.jpg');
		console.assert(answer.answerTypeAlt === 'png', 'answerTypeAlt should store the alt image extension.');
		console.assert(answerAltName === '042a-alt.png', 'Answer alt filename should be returned.');

		const themedRound = { cover: 'geo.png' };
		const coverAltName = attachCoverAlt(dir, themedRound, 'geo.png');
		console.assert(themedRound.coverAlt === 'geo-alt.webp', 'coverAlt should store the alt cover filename.');
		console.assert(coverAltName === 'geo-alt.webp', 'Cover alt filename should be returned.');

		const paddedQuestion = { id: '002' };
		fs.writeFileSync(path.join(dir, '2.png'), '');
		fs.writeFileSync(path.join(dir, '2-alt.WEBP'), '');
		const paddedAltName = attachQuestionAlt(dir, paddedQuestion, 'question', '2.png');
		console.assert(paddedQuestion.questionTypeAlt === 'webp', 'Padded question ids should still store the alt extension.');
		console.assert(paddedAltName === '002-alt.webp', 'Numeric alt filenames should be padded like regular media.');
		console.assert(fs.existsSync(path.join(dir, '002-alt.webp')), 'Alt file should be renamed to the padded id.');

		const noAltQuestion = { id: '099' };
		fs.writeFileSync(path.join(dir, '099.png'), '');
		console.assert(attachQuestionAlt(dir, noAltQuestion, 'question', '099.png') === null, 'Missing alt file should not attach.');
		console.assert(typeof noAltQuestion.questionTypeAlt === 'undefined', 'questionTypeAlt should be omitted when no alt exists.');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

console.log('All verifyMedia alt-file tests passed.');
