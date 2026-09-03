import { applyMediaTimesFromRecord, parseMediaTime } from '../../tools/ciamk.js';

const padInfo = (text) => {
	let result = `\n--- ${text} `;
	return result.padEnd(100, '-') + '\n';
};

const makeQuestion = (id) => ({
	id,
	questionText: `Question ${id}`,
	questionType: 'audio',
	answerText: `Answer ${id}`,
	answerType: 'video',
});

console.log(padInfo('parseMediaTime tests'));

console.log('Case 1: Valid mm:ss values convert to seconds.');
console.assert(parseMediaTime('0:00') === 0, '0:00 should be 0 seconds.');
console.assert(parseMediaTime('0:05') === 5, '0:05 should be 5 seconds.');
console.assert(parseMediaTime('1:30') === 90, '1:30 should be 90 seconds.');
console.assert(parseMediaTime('01:30') === 90, '01:30 should be 90 seconds.');
console.assert(parseMediaTime('12:05') === 725, '12:05 should be 725 seconds.');

console.log('Case 2: Invalid values return null.');
console.assert(parseMediaTime('') === null, 'Empty string should be invalid.');
console.assert(parseMediaTime('90') === null, 'Bare seconds should be invalid.');
console.assert(parseMediaTime('1:60') === null, 'Seconds over 59 should be invalid.');
console.assert(parseMediaTime('abc') === null, 'Non-time text should be invalid.');
console.assert(parseMediaTime('1:2:3') === null, 'hh:mm:ss should be invalid.');

console.log(padInfo('applyMediaTimesFromRecord tests'));

console.log('Case 1: Valid questionTime and answerTime are stored as seconds.');
{
	const question = makeQuestion('001');
	applyMediaTimesFromRecord(question, { questionTime: ' 1:30 ', answerTime: '0:45' });
	console.assert(question.questionTime === 90, 'questionTime 1:30 should become 90.');
	console.assert(question.answerTime === 45, 'answerTime 0:45 should become 45.');
}

console.log('Case 2: Missing or blank times are ignored.');
{
	const withoutColumns = makeQuestion('002');
	applyMediaTimesFromRecord(withoutColumns, { question: 'Q' });
	console.assert(typeof withoutColumns.questionTime === 'undefined', 'Missing questionTime should not add the field.');
	console.assert(typeof withoutColumns.answerTime === 'undefined', 'Missing answerTime should not add the field.');

	const blank = makeQuestion('003');
	applyMediaTimesFromRecord(blank, { questionTime: '   ', answerTime: '' });
	console.assert(typeof blank.questionTime === 'undefined', 'Blank questionTime should not add the field.');
	console.assert(typeof blank.answerTime === 'undefined', 'Blank answerTime should not add the field.');
}

console.log('Case 3: Invalid times produce errors and do not set the field.');
{
	const question = makeQuestion('004');
	const errors = [];
	applyMediaTimesFromRecord(question, { questionTime: '1:99', answerTime: 'oops' }, errors);
	console.assert(typeof question.questionTime === 'undefined', 'Invalid questionTime should not be stored.');
	console.assert(typeof question.answerTime === 'undefined', 'Invalid answerTime should not be stored.');
	console.assert(errors.length === 2, 'Both invalid times should produce errors.');
	console.assert(errors[0].includes('questionTime'), 'First error should mention questionTime.');
	console.assert(errors[1].includes('answerTime'), 'Second error should mention answerTime.');
}
