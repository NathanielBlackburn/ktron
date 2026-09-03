import {
	COUNT_BY,
	getMediaCountMode,
	getMediaCountModeLabel,
	resolveQuestionId,
	toggleMediaCountMode,
} from '../../tools/ciamk.js';

const padInfo = (text) => {
	let result = `\n--- ${text} `;
	return result.padEnd(100, '-') + '\n';
};

console.log(padInfo('media count mode settings tests'));

console.log('Case 1: Default mode is by id.');
console.assert(getMediaCountMode() === COUNT_BY.ID, 'Default media count mode should be by id.');
console.assert(getMediaCountModeLabel() === 'id', 'Default label should be id.');

console.log('Case 2: Toggle switches between id and row number.');
console.assert(toggleMediaCountMode() === COUNT_BY.ROW, 'First toggle should switch to row.');
console.assert(getMediaCountModeLabel() === 'numer wiersza', 'Row mode label should be numer wiersza.');
console.assert(toggleMediaCountMode() === COUNT_BY.ID, 'Second toggle should switch back to id.');
console.assert(getMediaCountMode() === COUNT_BY.ID, 'Mode should be id again after second toggle.');

console.log(padInfo('resolveQuestionId tests'));

console.log('Case 1: By row uses 1-based padded index.');
console.assert(resolveQuestionId({}, 0, COUNT_BY.ROW) === '001', 'First row should become 001.');
console.assert(resolveQuestionId({}, 41, COUNT_BY.ROW) === '042', 'Row 42 should become 042.');

console.log('Case 2: By id uses the id column (padded).');
console.assert(resolveQuestionId({ id: '7' }, 0, COUNT_BY.ID) === '007', 'id 7 should become 007.');
console.assert(resolveQuestionId({ id: ' 69 ' }, 99, COUNT_BY.ID) === '069', 'Trimmed id 69 should become 069.');
console.assert(resolveQuestionId({ id: '101' }, 0, COUNT_BY.ID) === '101', 'id 101 should stay 101.');

console.log('Case 3: By id requires a non-empty id value.');
{
	const errors = [];
	console.assert(resolveQuestionId({}, 0, COUNT_BY.ID, errors) === null, 'Missing id should return null.');
	console.assert(errors.length === 1 && errors[0].includes('id'), 'Missing id should produce an error.');

	const blankErrors = [];
	console.assert(resolveQuestionId({ id: '   ' }, 2, COUNT_BY.ID, blankErrors) === null, 'Blank id should return null.');
	console.assert(blankErrors[0].includes('Wiersz 3'), 'Blank id error should mention the CSV row number.');
}

console.log('All media count mode tests passed.');
