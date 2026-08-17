export const DEFAULT_SELECTION_WEIGHT = 1;

export const hasSpecifiedProbability = (question) =>
	typeof question.probability === 'number' && Number.isFinite(question.probability);

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

const percentageSum = (questions) =>
	questions.reduce((sum, question) => sum + question.probability, 0);

export const assignWeightsForPool = (questions = []) => {
	questions.forEach((question) => {
		question.selectionWeight = DEFAULT_SELECTION_WEIGHT;
		question.weightIncrement = 0;
	});
	const specified = questions.filter(hasSpecifiedProbability);
	if (!specified.length) {
		return;
	}
	const defaults = questions.filter((question) => !hasSpecifiedProbability(question));
	const F = percentageSum(specified) / 100;
	const D = defaults.length;
	specified.forEach((question) => {
		const f = question.probability / 100;
		if (D === 0) {
			question.selectionWeight = question.probability;
			question.weightIncrement = F < 1 ? f / (1 - F) : 1;
			return;
		}
		if (F >= 1) {
			question.selectionWeight = question.probability;
			question.weightIncrement = 1;
			return;
		}
		question.selectionWeight = (f * D) / (1 - F);
		question.weightIncrement = f / (1 - F);
	});
};

export const assignPoolWeights = (questions = [], themedRounds = []) => {
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

export const boostUnselectedWeights = (eligibleQuestions, picked, getWeight) => {
	eligibleQuestions.forEach((question) => {
		if (question === picked) {
			return;
		}
		const weight = getWeight(question);
		if (weight > DEFAULT_SELECTION_WEIGHT) {
			question.selectionWeight = weight + (question.weightIncrement || 0);
		}
	});
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
		const percentSum = percentageSum(specified);
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
