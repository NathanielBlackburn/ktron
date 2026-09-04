import { transformMultipleChoiceQuestion } from '../../tools/ciamk.js';

const padInfo = (text) => {
	let result = `\n--- ${text} `;
	return result.padEnd(100, '-') + '\n';
};

const makeQuestion = (extra = {}) => ({
	id: '001',
	questionText: 'Which city?[x_x]a) Paris b) London c) Rome d) Berlin',
	answerText: 'a) Paris',
	...extra,
});

console.log(padInfo('transformMultipleChoiceQuestion tests'));

console.log('Case 1: Choices are stored as a two-column grid, with the answer highlighted in the same layout.');

{
	const errors = [];
	const result = transformMultipleChoiceQuestion(makeQuestion(), errors);
	console.assert(errors.length === 0, 'A valid multiple-choice question should not produce errors.');
	console.assert(
		result.questionText ===
			'Which city?[br][br][mc][mci]a) Paris[/mci][mci]b) London[/mci][mci]c) Rome[/mci][mci]d) Berlin[/mci][/mc]',
		'Question choices should be wrapped as a 2x2 grid.',
	);
	console.assert(
		result.answerText ===
			'Which city?[br][br][mc][mci][blue]a) Paris[/blue][/mci][mci]b) London[/mci][mci]c) Rome[/mci][mci]d) Berlin[/mci][/mc]',
		'The highlighted answer should keep the same 2x2 grid and mark the correct choice.',
	);
}

console.log('Case 2: Non-multiple-choice questions are left unchanged.');

{
	const question = {
		id: '002',
		questionText: 'What is the capital of France?',
		answerText: 'Paris',
	};
	const result = transformMultipleChoiceQuestion(question, []);
	console.assert(result === question, 'Questions without the multiple-choice marker should be returned as-is.');
}

console.log('All multiple-choice tests passed.');
