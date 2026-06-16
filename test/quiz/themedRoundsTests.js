import { mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseThemedRoundsFromRecords, parseCategoryCoversFromRecords, applyCategoryCoversToThemedRounds, validateThemedRounds } from '../../tools/ciamk.js';

const padInfo = (text) => {
	let result = `\n--- ${text} `;
	return result.padEnd(100, '-') + '\n';
};

const makeQuestion = (id, category) => ({
	id,
	questionText: `Question ${id}`,
	questionType: '',
	answerText: `Answer ${id}`,
	answerType: '',
	used: false,
	...(category ? { category } : {}),
});

const makeQuestionsInCategory = (category, count, idPrefix = '0') => {
	return Array.from({ length: count }, (_, index) => {
		const id = `${idPrefix}${(index + 1).toString().padStart(2, '0')}`;
		return makeQuestion(id, category);
	});
};

console.log(padInfo('parseThemedRoundsFromRecords tests'));

console.log('Case 1: Valid config with multiple entries is parsed and sorted by round.');

{
	const records = [
		{ category: 'Literatura', themedRound: '5:literature' },
		{ category: 'Geografia', themedRound: '3:geo;7:geo-again' },
	];
	const { themedRounds, errors } = parseThemedRoundsFromRecords(records);
	console.assert(errors.length === 0, 'Valid config should produce no parse errors.');
	console.assert(themedRounds.length === 3, 'Should parse three themed rounds.');
	console.assert(themedRounds[0].round === 3 && themedRounds[0].name === 'geo' && themedRounds[0].category === 'Geografia', 'First round should use token name and row category.');
	console.assert(themedRounds[1].round === 5 && themedRounds[1].name === 'literature' && themedRounds[1].category === 'Literatura', 'Second round should use token name and row category.');
	console.assert(themedRounds[2].round === 7 && themedRounds[2].name === 'geo-again' && themedRounds[2].category === 'Geografia', 'Third round should reuse row category with its own name.');
}

console.log('Case 2: Duplicate round number keeps the first entry and reports an error.');

{
	const { themedRounds, errors } = parseThemedRoundsFromRecords([
		{ category: 'Historia', themedRound: '5:history' },
		{ category: 'Geografia', themedRound: '5:geo' },
	]);
	console.assert(themedRounds.length === 1, 'Duplicate round should only keep the first entry.');
	console.assert(errors.some((error) => error.includes('Powtórzony numer rundy tematycznej: 5')), 'Duplicate round should produce an error.');
}

console.log('Case 3: Invalid round number produces errors and no themed rounds.');

{
	const { themedRounds, errors } = parseThemedRoundsFromRecords([{ category: 'Historia', themedRound: 'abc:Historia' }]);
	console.assert(themedRounds.length === 0, 'Invalid round number should not produce themed rounds.');
	console.assert(errors.length > 0, 'Invalid round number should produce errors.');
}

console.log('Case 4: Themed round without row category produces an error.');

{
	const { themedRounds, errors } = parseThemedRoundsFromRecords([{ themedRound: '5:arthistory' }]);
	console.assert(themedRounds.length === 0, 'Themed round without category should not be stored.');
	console.assert(errors.some((error) => error.includes('wymaga kategorii')), 'Missing row category should produce an error.');
}

console.log('Case 5: Display name can differ from the question category.');

{
	const records = [{ category: 'Historia sztuki', themedRound: '5:arthistory' }];
	const { themedRounds, errors } = parseThemedRoundsFromRecords(records);
	console.assert(errors.length === 0, 'Alias name should parse without errors.');
	console.assert(themedRounds[0].name === 'arthistory', 'Token after colon should be the themed round name.');
	console.assert(themedRounds[0].category === 'Historia sztuki', 'Row category should be used for the question pool.');
}

console.log(padInfo('validateThemedRounds tests'));

console.log('Case 1: Ten questions in category passes for one themed round.');

{
	const themedRounds = [{ round: 5, name: 'history', category: 'Historia' }];
	const questions = makeQuestionsInCategory('Historia', 10);
	const errors = validateThemedRounds(themedRounds, questions);
	console.assert(errors.length === 0, 'Ten questions in category should pass for one themed round.');
}

console.log('Case 2: Nine questions fails for one themed round.');

{
	const themedRounds = [{ round: 5, name: 'history', category: 'Historia' }];
	const questions = makeQuestionsInCategory('Historia', 9);
	const errors = validateThemedRounds(themedRounds, questions);
	console.assert(errors.length === 1, 'Nine questions should fail for one themed round.');
	console.assert(errors[0].includes('wymagane jest co najmniej 10'), 'Error should mention minimum of 10.');
}

console.log('Case 3: Nineteen questions fails for two themed rounds in the same category.');

{
	const themedRounds = [
		{ round: 3, name: 'geo-a', category: 'Geografia' },
		{ round: 7, name: 'geo-b', category: 'Geografia' },
	];
	const questions = makeQuestionsInCategory('Geografia', 19);
	const errors = validateThemedRounds(themedRounds, questions);
	console.assert(errors.length === 1, 'Nineteen questions should fail for two themed rounds in same category.');
	console.assert(errors[0].includes('wymagane jest co najmniej 20'), 'Error should mention minimum of 20.');
}

console.log('Case 4: Unknown category fails validation.');

{
	const themedRounds = [{ round: 5, name: 'missing', category: 'Nieistniejaca' }];
	const questions = [makeQuestion('001', 'Inna')];
	const errors = validateThemedRounds(themedRounds, questions);
	console.assert(errors.some((error) => error.includes('brak pytań w kategorii "Nieistniejaca"')), 'Unknown category should fail validation.');
}

console.log(padInfo('parseCategoryCoversFromRecords tests'));

console.log('Case 1: First non-empty cover per category wins.');

{
	const records = [
		{ category: 'Literatura', categoryCover: 'lit-a.png' },
		{ category: 'Literatura', categoryCover: 'lit-b.png' },
		{ category: 'Geografia', categoryCover: 'geo.png' },
		{ category: 'Historia', categoryCover: '   ' },
	];
	const { categoryCovers, errors } = parseCategoryCoversFromRecords(records);
	console.assert(errors.length === 0, 'Valid covers should produce no errors.');
	console.assert(categoryCovers.Literatura === 'lit-a.png', 'First cover for Literatura should win.');
	console.assert(categoryCovers.Geografia === 'geo.png', 'Geografia cover should be parsed.');
	console.assert(typeof categoryCovers.Historia === 'undefined', 'Blank cover should be ignored.');
}

console.log('Case 2: Cover without category produces an error.');

{
	const { categoryCovers, errors } = parseCategoryCoversFromRecords([{ categoryCover: 'orphan.png' }]);
	console.assert(Object.keys(categoryCovers).length === 0, 'Cover without category should not be stored.');
	console.assert(errors.some((error) => error.includes('bez kategorii')), 'Cover without category should produce an error.');
}

console.log('Case 3: Covers are applied to matching themed rounds.');

{
	const themedRounds = [
		{ round: 3, name: 'geo', category: 'Geografia' },
		{ round: 5, name: 'lit', category: 'Literatura' },
	];
	const categoryCovers = { Literatura: 'lit.png' };
	const enriched = applyCategoryCoversToThemedRounds(themedRounds, categoryCovers);
	console.assert(enriched[0].cover === undefined, 'Category without cover should stay unchanged.');
	console.assert(enriched[1].cover === 'lit.png', 'Matching category should receive cover.');
}

console.log(padInfo('QuizEngine themed round selection tests'));

const mockDB = {
	useUpQuestion: () => {},
	createGame: () => [
		{ ID: 1, name: 'Player 1', isActive: true, isRemoved: false },
		{ ID: 2, name: 'Player 2', isActive: true, isRemoved: false },
	],
};

mock.module(fileURLToPath(new URL('../../js/core/db.js', import.meta.url)), {
	namedExports: {
		DB: mockDB,
	},
});

mock.module(fileURLToPath(new URL('../../js/core/config.js', import.meta.url)), {
	namedExports: {
		Loader: {
			config: {
				dontRandomize: true,
				debugMode: false,
			},
			quizzes: [],
		},
	},
});

mock.module(fileURLToPath(new URL('../../js/model/settings.js', import.meta.url)), {
	namedExports: {
		settings: {
			showPointsAfterEachRound: false,
		},
	},
});

mock.module(fileURLToPath(new URL('../../js/core/i18n.js', import.meta.url)), {
	namedExports: {
		I18n: {
			t: (key) => key,
		},
	},
});

const { QuizEngine } = await import('../../js/quiz/quizEngine.js');

console.log('Case 1: Regular round excludes themed-category questions.');

{
	QuizEngine.round = 1;
	QuizEngine.currentPlayerIndex = 0;
	QuizEngine.themedRounds = [{ round: 5, name: 'literature', category: 'Literatura' }];
	QuizEngine.questions = [
		makeQuestion('001', 'Literatura'),
		makeQuestion('002', 'Geografia'),
		makeQuestion('003'),
	];
	const eligible = QuizEngine.getEligibleQuestions(QuizEngine.questions, undefined);
	console.assert(eligible.length === 2, 'Regular round should exclude only themed-category questions.');
	console.assert(eligible.some((question) => question.id === '002'), 'Regular round should keep non-themed categories.');
	console.assert(eligible.some((question) => question.id === '003'), 'Regular round should keep uncategorized questions.');
	console.assert(!eligible.some((question) => question.id === '001'), 'Regular round should exclude themed-category questions.');
}

console.log('Case 2: Themed round includes only questions from the themed category.');

{
	QuizEngine.round = 5;
	QuizEngine.themedRounds = [{ round: 5, name: 'literature', category: 'Literatura' }];
	QuizEngine.questions = [
		makeQuestion('001', 'Literatura'),
		makeQuestion('002', 'Geografia'),
		makeQuestion('003', 'Literatura'),
	];
	const eligible = QuizEngine.getEligibleQuestions(QuizEngine.questions, 'Literatura');
	console.assert(eligible.length === 2, 'Themed round should include only questions from themed category.');
	console.assert(eligible.every((question) => question.category === 'Literatura'), 'All eligible themed questions should match category.');
}

console.log('Case 3: Themed round picks from themed pool and announces the category.');

{
	QuizEngine.round = 5;
	QuizEngine.currentPlayerIndex = 0;
	QuizEngine.players = [
		{ ID: 1, name: 'Player 1', isActive: true, isRemoved: false },
	];
	QuizEngine.themedRounds = [{ round: 5, name: 'arthistory', category: 'Historia sztuki', cover: 'art.png' }];
	QuizEngine.questions = [
		makeQuestion('001', 'Historia sztuki'),
		makeQuestion('002', 'Geografia'),
	];
	const result = QuizEngine.pickNextQuestion();
	console.assert(result.question.id === '001', 'Themed round should pick from row category pool.');
	console.assert(result.startRound === true, 'First turn of round should set startRound.');
	console.assert(result.themedRoundToast?.round === 5, 'Themed round toast should include round number.');
	console.assert(result.themedRoundToast?.name === 'arthistory', 'Themed round toast should include internal name.');
	console.assert(result.themedRoundToast?.category === 'Historia sztuki', 'Themed round toast should include question category for announcement.');
	console.assert(result.themedRoundToast?.cover === 'art.png', 'Themed round toast should include category cover.');
}

console.log('Case 3b: Themed round toast omits cover when none is configured.');

{
	QuizEngine.round = 5;
	QuizEngine.currentPlayerIndex = 0;
	QuizEngine.players = [
		{ ID: 1, name: 'Player 1', isActive: true, isRemoved: false },
	];
	QuizEngine.themedRounds = [{ round: 5, name: 'literature', category: 'Literatura' }];
	QuizEngine.questions = [
		makeQuestion('001', 'Literatura'),
		makeQuestion('002', 'Geografia'),
	];
	const result = QuizEngine.pickNextQuestion();
	console.assert(result.themedRoundToast?.cover === undefined, 'Themed round toast should omit cover when not configured.');
}

console.log('Case 4: After all themed rounds for a category, leftovers re-enter the normal pool.');

{
	QuizEngine.round = 6;
	QuizEngine.themedRounds = [{ round: 5, name: 'literature', category: 'Literatura' }];
	QuizEngine.questions = [
		makeQuestion('001', 'Literatura'),
		makeQuestion('002', 'Geografia'),
		makeQuestion('003'),
	];
	const eligible = QuizEngine.getEligibleQuestions(QuizEngine.questions, undefined);
	console.assert(eligible.length === 3, 'After themed round, leftover themed-category questions should be eligible.');
	console.assert(eligible.some((question) => question.id === '001'), 'Leftover themed-category questions should re-enter normal pool.');
}

console.log('Case 5: Category stays reserved while a later themed round for it remains.');

{
	QuizEngine.round = 4;
	QuizEngine.themedRounds = [
		{ round: 3, name: 'geo-a', category: 'Geografia' },
		{ round: 7, name: 'geo-b', category: 'Geografia' },
	];
	QuizEngine.questions = [
		makeQuestion('001', 'Geografia'),
		makeQuestion('002', 'Historia'),
	];
	const eligible = QuizEngine.getEligibleQuestions(QuizEngine.questions, undefined);
	console.assert(eligible.length === 1, 'Category with a future themed round should stay reserved.');
	console.assert(eligible[0].id === '002', 'Only non-reserved categories should be eligible.');
	console.assert(!eligible.some((question) => question.id === '001'), 'Geografia should stay reserved until round 7 is over.');
}

console.log('Case 6: After the last themed round for a repeated category, leftovers unlock.');

{
	QuizEngine.round = 8;
	QuizEngine.themedRounds = [
		{ round: 3, name: 'geo-a', category: 'Geografia' },
		{ round: 7, name: 'geo-b', category: 'Geografia' },
		{ round: 5, name: 'lit', category: 'Literatura' },
	];
	QuizEngine.questions = [
		makeQuestion('001', 'Geografia'),
		makeQuestion('002', 'Literatura'),
		makeQuestion('003', 'Historia'),
	];
	const eligible = QuizEngine.getEligibleQuestions(QuizEngine.questions, undefined);
	console.assert(eligible.length === 3, 'After last themed rounds, all leftover categories should unlock.');
	console.assert(eligible.every((question) => ['001', '002', '003'].includes(question.id)), 'Geografia and Literatura leftovers should be eligible after their themed rounds.');
}

console.log('Case 7: Later themed round of the same category never reuses questions from an earlier themed round.');

{
	QuizEngine.themedRounds = [
		{ round: 3, name: 'geo-a', category: 'Geografia' },
		{ round: 7, name: 'geo-b', category: 'Geografia' },
	];
	QuizEngine.players = [
		{ ID: 1, name: 'Player 1', isActive: true, isRemoved: false },
	];
	QuizEngine.questions = [
		makeQuestion('001', 'Geografia'),
		makeQuestion('002', 'Geografia'),
		makeQuestion('003', 'Geografia'),
	];

	QuizEngine.round = 3;
	QuizEngine.currentPlayerIndex = 0;
	const firstPick = QuizEngine.pickNextQuestion();
	console.assert(firstPick.question.category === 'Geografia', 'First themed round should pick Geografia.');
	console.assert(firstPick.question.used === true, 'Picked question should be marked used.');

	const usedId = firstPick.question.id;
	const unusedAfterFirst = QuizEngine.questions.filter((question) => !question.used);
	const eligibleInSameRound = QuizEngine.getEligibleQuestions(unusedAfterFirst, 'Geografia');
	console.assert(!eligibleInSameRound.some((question) => question.id === usedId), 'Used question should leave the themed pool immediately.');

	QuizEngine.round = 7;
	QuizEngine.currentPlayerIndex = 0;
	const unusedBeforeSecond = QuizEngine.questions.filter((question) => !question.used);
	const eligibleInSecondThemedRound = QuizEngine.getEligibleQuestions(unusedBeforeSecond, 'Geografia');
	console.assert(
		eligibleInSecondThemedRound.every((question) => question.id !== usedId),
		'Second themed round for same category must not include questions used in the first.',
	);
	console.assert(eligibleInSecondThemedRound.length === 2, 'Second themed round should only see remaining unused Geografia questions.');

	const secondPick = QuizEngine.pickNextQuestion();
	console.assert(secondPick.question.id !== usedId, 'Second themed round must not pick a previously used category question.');
	console.assert(secondPick.question.category === 'Geografia', 'Second themed round should still pick from Geografia.');
}

console.log('\nAll themed round tests completed.\n');
