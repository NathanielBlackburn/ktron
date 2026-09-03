import { applyCategoryImageFromRecord } from '../../tools/ciamk.js';

const makeQuestion = (id, extra = {}) => ({
	id,
	questionText: `Question ${id}`,
	questionType: '',
	answerText: `Answer ${id}`,
	answerType: '',
	...extra,
});

console.log('Case 1: Non-empty categoryImage is mapped onto the question.');

{
	const question = makeQuestion('001');
	applyCategoryImageFromRecord(question, { categoryImage: ' lit.png ' });
	console.assert(question.categoryImage === 'lit.png', 'Trimmed categoryImage should be stored on the question.');
}

console.log('Case 2: Missing or blank categoryImage is ignored.');

{
	const withoutColumn = makeQuestion('002');
	applyCategoryImageFromRecord(withoutColumn, { question: 'Q' });
	console.assert(typeof withoutColumn.categoryImage === 'undefined', 'Missing categoryImage should not add the field.');

	const blank = makeQuestion('003');
	applyCategoryImageFromRecord(blank, { categoryImage: '   ' });
	console.assert(typeof blank.categoryImage === 'undefined', 'Blank categoryImage should not add the field.');
}

console.log('All categoryImage tests passed.');
