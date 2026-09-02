import { mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyProbabilityFromRecord } from '../../tools/ciamk.js';
import {
	assignPoolWeights,
	boostUnselectedWeights,
	getQuestionWeight,
	getSpecifiedQuestionProbabilities,
	pickWeightedQuestion,
	PROBABILITY_MISS_INCREMENT,
	validateProbabilities,
} from '../../js/quiz/questionWeights.js';

const padInfo = (text) => {
	let result = `\n--- ${text} `;
	return result.padEnd(100, '-') + '\n';
};

const makeQuestion = (id, extra = {}) => ({
	id,
	questionText: `Question ${id}`,
	questionType: '',
	answerText: `Answer ${id}`,
	answerType: '',
	used: false,
	...extra,
});

const makePool = (count, boosted = {}) =>
	Array.from({ length: count }, (_, index) => {
		const id = `${(index + 1).toString().padStart(3, '0')}`;
		if (boosted[id]) {
			return makeQuestion(id, { probability: boosted[id] });
		}
		return makeQuestion(id);
	});

const almostEqual = (actual, expected, epsilon = 1e-9) => Math.abs(actual - expected) < epsilon;

console.log(padInfo('applyProbabilityFromRecord tests'));

console.log('Case 1: Parses percentages, including comma decimals, and ignores blanks.');

{
	const parsed = makeQuestion('001');
	applyProbabilityFromRecord(parsed, { probability: ' 60 ' });
	console.assert(parsed.probability === 60, 'Integer probability should be stored as a number.');

	const comma = makeQuestion('002');
	applyProbabilityFromRecord(comma, { probability: '12,5' });
	console.assert(comma.probability === 12.5, 'Comma decimals should be parsed.');

	const blank = makeQuestion('003');
	applyProbabilityFromRecord(blank, { probability: '   ' });
	console.assert(typeof blank.probability === 'undefined', 'Blank probability should be ignored.');

	const missing = makeQuestion('004');
	applyProbabilityFromRecord(missing, { question: 'Q' });
	console.assert(typeof missing.probability === 'undefined', 'Missing probability should be ignored.');
}

console.log('Case 2: Invalid probability values produce errors.');

{
	const errors = [];
	const question = makeQuestion('005');
	applyProbabilityFromRecord(question, { probability: 'abc' }, errors);
	console.assert(typeof question.probability === 'undefined', 'Invalid probability should not be stored.');
	console.assert(errors.some((error) => error.includes('niepoprawna wartość probability')), 'Invalid probability should produce an error.');
}

console.log(padInfo('validateProbabilities tests'));

console.log('Case 1: Out of range and overflowing pool sums fail.');

{
	const rangeErrors = validateProbabilities([makeQuestion('001', { probability: 100 })]);
	console.assert(rangeErrors.some((error) => error.includes('(0, 100)')), '100 should be rejected.');

	const overflow = [
		makeQuestion('001', { probability: 60 }),
		makeQuestion('002', { probability: 50 }),
		makeQuestion('003'),
	];
	const overflowErrors = validateProbabilities(overflow);
	console.assert(overflowErrors.some((error) => error.includes('przekracza 100%')), 'Pool percentages over 100 should fail.');
}

console.log('Case 2: 100% with remaining default questions fails; a full specified pool passes.');

{
	const withDefaults = [
		makeQuestion('001', { probability: 60 }),
		makeQuestion('002', { probability: 40 }),
		makeQuestion('003'),
	];
	const defaultErrors = validateProbabilities(withDefaults);
	console.assert(defaultErrors.some((error) => error.includes('100%')), 'A 100% sum with defaults should fail.');

	const fullPool = [
		makeQuestion('001', { probability: 60 }),
		makeQuestion('002', { probability: 40 }),
	];
	console.assert(validateProbabilities(fullPool).length === 0, 'Percentages that fill the whole pool should pass.');
}

console.log('Case 3: Themed and unthemed percentages are validated in separate pools.');

{
	const questions = [
		makeQuestion('001', { category: 'Literatura', probability: 60 }),
		makeQuestion('002', { category: 'Literatura' }),
		makeQuestion('003', { probability: 60 }),
		makeQuestion('004'),
	];
	const themedRounds = [{ round: 5, name: 'lit', category: 'Literatura' }];
	console.assert(validateProbabilities(questions, themedRounds).length === 0, 'The same percentage in different pools should not be added together.');
}

console.log(padInfo('assignPoolWeights tests'));

console.log('Case 1: 60% among 10 questions becomes weight 13.5.');

{
	const questions = makePool(10, { '001': 60 });
	assignPoolWeights(questions, [], { resetCurrent: true });
	console.assert(almostEqual(questions[0].selectionWeight, 13.5), '60% of 10 questions should convert to weight 13.5.');
	console.assert(almostEqual(questions[0].currentProbability, 60), 'Current probability should start at the configured value.');
	console.assert(questions.slice(1).every((question) => question.selectionWeight === 1), 'Unspecified questions should keep weight 1.');
	const total = questions.reduce((sum, question) => sum + question.selectionWeight, 0);
	console.assert(almostEqual(questions[0].selectionWeight / total, 0.6), 'First draw probability should be 60%.');
}

console.log(`Case 2: After a miss, probability rises by ${PROBABILITY_MISS_INCREMENT} points (60% -> 70%).`);

{
	const questions = makePool(10, { '001': 60 });
	assignPoolWeights(questions, [], { resetCurrent: true });
	boostUnselectedWeights(questions, questions[1], {
		allQuestions: questions,
		themedRounds: [],
	});
	console.assert(almostEqual(questions[0].currentProbability, 70), 'Unselected boosted question should gain 10 percentage points.');
	console.assert(almostEqual(questions[0].selectionWeight, 21), '70% among 10 questions should convert to weight 21.');
	console.assert(questions[1].selectionWeight === 1, 'The selected default question should not be incremented.');
	const againstOriginalDefaults = questions[0].selectionWeight / (questions[0].selectionWeight + 9);
	console.assert(almostEqual(againstOriginalDefaults, 0.7), 'Updated weight should be 70% against the original nine defaults.');
}

console.log('Case 3: Themed probabilities do not affect the unthemed pool.');

{
	const questions = [
		makeQuestion('001', { category: 'Literatura', probability: 60 }),
		...Array.from({ length: 9 }, (_, index) => makeQuestion(`1${(index + 1).toString().padStart(2, '0')}`, { category: 'Literatura' })),
		makeQuestion('002', { probability: 60 }),
		...Array.from({ length: 9 }, (_, index) => makeQuestion(`2${(index + 1).toString().padStart(2, '0')}`)),
	];
	const themedRounds = [{ round: 5, name: 'lit', category: 'Literatura' }];
	assignPoolWeights(questions, themedRounds, { resetCurrent: true });
	const themedBoosted = questions.find((question) => question.id === '001');
	const unthemedBoosted = questions.find((question) => question.id === '002');
	console.assert(almostEqual(themedBoosted.selectionWeight, 13.5), 'Themed 60% should be weighted against its category pool.');
	console.assert(almostEqual(unthemedBoosted.selectionWeight, 13.5), 'Unthemed 60% should be weighted against the unthemed pool.');
}

console.log('Case 4: Leftover themed questions use weight 1 in the global pool.');

{
	const questions = [
		makeQuestion('001', { category: 'Literatura', probability: 60 }),
		makeQuestion('002'),
	];
	const themedRounds = [{ round: 5, name: 'lit', category: 'Literatura' }];
	assignPoolWeights(questions, themedRounds, { resetCurrent: true });
	console.assert(almostEqual(questions[0].selectionWeight, 60), 'A lone themed percentage question should keep its specified weight in the themed pool.');
	console.assert(
		getQuestionWeight(questions[0], { themedCategory: 'Literatura', themedRounds }) === questions[0].selectionWeight,
		'Themed draws should use the themed selection weight.',
	);
	console.assert(
		getQuestionWeight(questions[0], { themedRounds }) === 1,
		'Global draws should ignore themed-question probability.',
	);
	console.assert(
		getQuestionWeight(questions[1], { themedRounds }) === 1,
		'Unthemed defaults should stay at weight 1 globally.',
	);
}

console.log('Case 5: Weighted pick follows the cumulative weight threshold.');

{
	const questions = makePool(10, { '001': 60 });
	assignPoolWeights(questions, [], { resetCurrent: true });
	const getWeight = (question) => question.selectionWeight;
	const early = pickWeightedQuestion(questions, getWeight, { random: () => 0 });
	console.assert(early.id === '001', 'A low random value should pick the boosted question.');
	const later = pickWeightedQuestion(questions, getWeight, { random: () => 0.6 });
	console.assert(later.id !== '001', 'A random value past 60% should pick a default question.');
	const deterministic = pickWeightedQuestion(questions, getWeight, { dontRandomize: true });
	console.assert(deterministic.id === '001', 'dontRandomize should keep picking the first eligible question.');
}

console.log('Case 6: Current probabilities include only specified questions in the current pool.');

{
	const questions = makePool(10, { '001': 60, '003': 20 });
	assignPoolWeights(questions);
	const rows = getSpecifiedQuestionProbabilities(questions, (question) => question.selectionWeight);
	console.assert(rows.length === 2, 'Only questions with a configured probability should be listed.');
	console.assert(rows[0].id === '001' && almostEqual(rows[0].configured, 60), 'First specified question should keep configured 60.');
	console.assert(almostEqual(rows[0].current, 60), 'First specified question should currently have 60% of the pool.');
	console.assert(rows[1].id === '003' && almostEqual(rows[1].configured, 20), 'Second specified question should keep configured 20.');
	console.assert(almostEqual(rows[1].current, 20), 'Second specified question should currently have 20% of the pool.');
}

mock.module(fileURLToPath(new URL('../../js/core/db.js', import.meta.url)), {
	namedExports: {
		DB: {
			useUpQuestion: () => {},
			createGame: () => [],
		},
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

console.log(padInfo('QuizEngine probability selection tests'));

console.log('Case 1: A missed boosted question gains weight before the next draw.');

{
	QuizEngine.round = 1;
	QuizEngine.themedRounds = [];
	QuizEngine.currentPlayerIndex = 0;
	QuizEngine.players = [{ ID: 1, name: 'Player 1', isActive: true, isRemoved: false }];
	QuizEngine.questions = makePool(10, { '010': 60 });
	assignPoolWeights(QuizEngine.questions, [], { resetCurrent: true });
	const first = QuizEngine.pickNextQuestion();
	console.assert(first.question.id === '001', 'dontRandomize should still pick the first eligible question.');
	const boosted = QuizEngine.questions.find((question) => question.id === '010');
	console.assert(almostEqual(boosted.currentProbability, 70), 'Unselected 60% question should rise to 70%.');
	console.assert(almostEqual(boosted.selectionWeight, 21), '70% weight should be recalculated to 21.');
}
