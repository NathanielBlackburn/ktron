export const DEFAULT_SELECTION_WEIGHT = 1;
export const PROBABILITY_MISS_INCREMENT = 10;

export const hasSpecifiedProbability = (question) =>
	typeof question.probability === 'number' && Number.isFinite(question.probability);

export const getCurrentProbability = (question) => {
	if (!hasSpecifiedProbability(question)) {
		return undefined;
	}
	return question.currentProbability ?? question.probability;
};

export const getThemedCategories = (themedRounds = []) =>
	new Set(themedRounds.map((themedRound) => themedRound.category));

export const isThemedPoolQuestion = (question, themedRounds = []) =>
	Boolean(question.category && getThemedCategories(themedRounds).has(question.category));

export const getProbabilityPools = (questions = [], themedRounds = []) => {
	const themedCategories = [...getThemedCategories(themedRounds)];
	const themedSet = new Set(themedCategories);
	const pools = [
		{
			name: 'Pytania spoza rund tematycznych',
			questions: questions.filter((question) => !themedSet.has(question.category)),
		},
	];
	themedCategories.forEach((category) => {
		pools.push({
			name: `Kategoria "${category}"`,
			questions: questions.filter((question) => question.category === category),
		});
	});
	return pools;
};

const currentPercentageSum = (questions) =>
	questions
		.filter(hasSpecifiedProbability)
		.reduce((sum, question) => sum + getCurrentProbability(question), 0);

export const assignWeightsForPool = (questions = []) => {
	questions.forEach((question) => {
		if (!hasSpecifiedProbability(question)) {
			question.selectionWeight = DEFAULT_SELECTION_WEIGHT;
			return;
		}
		if (typeof question.currentProbability === 'undefined') {
			question.currentProbability = question.probability;
		}
	});
	const specified = questions.filter(hasSpecifiedProbability);
	if (!specified.length) {
		return;
	}
	const defaults = questions.filter((question) => !hasSpecifiedProbability(question));
	const F = currentPercentageSum(questions) / 100;
	const D = defaults.length;
	specified.forEach((question) => {
		const currentProbability = getCurrentProbability(question);
		const f = currentProbability / 100;
		if (D === 0) {
			question.selectionWeight = currentProbability;
			return;
		}
		if (F >= 1) {
			question.selectionWeight = currentProbability;
			return;
		}
		question.selectionWeight = (f * D) / (1 - F);
	});
};

export const assignPoolWeights = (questions = [], themedRounds = [], { resetCurrent = false } = {}) => {
	if (resetCurrent) {
		questions.forEach((question) => {
			if (hasSpecifiedProbability(question)) {
				question.currentProbability = question.probability;
			} else {
				delete question.currentProbability;
			}
		});
	}
	getProbabilityPools(questions, themedRounds).forEach((pool) => {
		assignWeightsForPool(pool.questions);
	});
};

export const getQuestionWeight = (question, { themedCategory, themedRounds } = {}) => {
	if (themedCategory) {
		return question.selectionWeight ?? DEFAULT_SELECTION_WEIGHT;
	}
	if (isThemedPoolQuestion(question, themedRounds)) {
		return DEFAULT_SELECTION_WEIGHT;
	}
	return question.selectionWeight ?? DEFAULT_SELECTION_WEIGHT;
};

export const boostUnselectedWeights = (eligibleQuestions, picked, { allQuestions, themedRounds } = {}) => {
	if (!allQuestions?.length) {
		return;
	}
	let boosted = false;
	eligibleQuestions.forEach((question) => {
		if (question === picked || !hasSpecifiedProbability(question)) {
			return;
		}
		const currentProbability = getCurrentProbability(question);
		question.currentProbability = Math.min(100, currentProbability + PROBABILITY_MISS_INCREMENT);
		boosted = true;
	});
	if (boosted) {
		assignPoolWeights(allQuestions, themedRounds);
	}
};

export const pickWeightedQuestion = (questions, getWeight, { dontRandomize, random } = {}) => {
	if (!questions.length) {
		return undefined;
	}
	if (dontRandomize) {
		return questions[0];
	}
	const weights = questions.map((question) => getWeight(question));
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let threshold = (random ?? Math.random)() * total;
	for (let i = 0; i < questions.length; i += 1) {
		threshold -= weights[i];
		if (threshold < 0) {
			return questions[i];
		}
	}
	return questions[questions.length - 1];
};

export const getSpecifiedQuestionProbabilities = (eligibleQuestions, getWeight) => {
	const specified = eligibleQuestions.filter(hasSpecifiedProbability);
	if (!specified.length) {
		return [];
	}
	const totalWeight = eligibleQuestions.reduce((sum, question) => sum + getWeight(question), 0);
	return specified.map((question) => {
		const weight = getWeight(question);
		return {
			id: question.id,
			configured: question.probability,
			current: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
			currentProbability: getCurrentProbability(question),
		};
	});
};

export const validateProbabilities = (questions = [], themedRounds = []) => {
	const errors = [];
	questions.forEach((question) => {
		if (!hasSpecifiedProbability(question)) {
			return;
		}
		if (question.probability <= 0 || question.probability >= 100) {
			errors.push(`Pytanie ${question.id}: probability musi być liczbą z zakresu (0, 100).`);
		}
	});
	getProbabilityPools(questions, themedRounds).forEach((pool) => {
		const specified = pool.questions.filter(hasSpecifiedProbability);
		if (!specified.length) {
			return;
		}
		const percentSum = specified.reduce((sum, question) => sum + question.probability, 0);
		const defaultCount = pool.questions.length - specified.length;
		if (percentSum > 100 + 1e-9) {
			errors.push(`${pool.name}: suma probability (${percentSum}%) przekracza 100%.`);
		} else if (Math.abs(percentSum - 100) <= 1e-9 && defaultCount > 0) {
			errors.push(
				`${pool.name}: suma probability wynosi 100%, więc pytania bez probability nigdy nie zostaną wylosowane.`,
			);
		}
	});
	return errors;
};
