import { handleQuizKeyup } from '../../js/app/quizKeybindings.js';

const padInfo = (text) => {
	let result = `\n--- ${text} `;
	return result.padEnd(100, '-') + '\n';
};

const createMockClassList = (initial = []) => {
	const classes = new Set(initial);
	return {
		contains(className) {
			return classes.has(className);
		},
	};
};

const makeButton = (id, hidden = false) => ({
	id,
	classList: createMockClassList(hidden ? ['d-none'] : []),
});

const makeEvent = (key, target = { matches: () => false }) => ({
	key,
	target,
});

console.log(padInfo('handleQuizKeyup tests'));

console.log('Case 1: a/o triggers answer when the answer button is visible.');

{
	const document = {
		getElementById(id) {
			if (id === 'getAnswer') {
				return makeButton(id);
			}
			return null;
		},
	};
	const calls = [];
	const handled = handleQuizKeyup(makeEvent('a'), {
		document,
		isGameInProgress: () => true,
		actions: {
			questionAnswered: () => calls.push('answer'),
		},
	});
	console.assert(handled === true, 'Answer shortcut should be handled.');
	console.assert(calls.join() === 'answer', 'Answer shortcut should call questionAnswered().');
}

console.log('Case 2: o is an alias for answer.');

{
	const document = {
		getElementById(id) {
			if (id === 'getAnswer') {
				return makeButton(id);
			}
			return null;
		},
	};
	const calls = [];
	handleQuizKeyup(makeEvent('O'), {
		document,
		isGameInProgress: () => true,
		actions: {
			questionAnswered: () => calls.push('answer'),
		},
	});
	console.assert(calls.join() === 'answer', 'o should trigger questionAnswered().');
}

console.log('Case 3: 0, 1 and 2 trigger scoring when point buttons are visible.');

{
	const visible = new Set(['notAnswered', 'buttonOne', 'buttonTwo']);
	const document = {
		getElementById(id) {
			return visible.has(id) ? makeButton(id) : null;
		},
	};
	const calls = [];
	const actions = {
		answeredIncorrectly: () => calls.push('0'),
		answeredCorrectly: (points) => calls.push(String(points)),
	};
	handleQuizKeyup(makeEvent('0'), { document, isGameInProgress: () => true, actions });
	handleQuizKeyup(makeEvent('1'), { document, isGameInProgress: () => true, actions });
	handleQuizKeyup(makeEvent('2'), { document, isGameInProgress: () => true, actions });
	console.assert(calls.join() === '0,1,2', '0, 1 and 2 should trigger the matching score actions.');
}

console.log('Case 4: Shortcuts are ignored while typing in form fields.');

{
	const document = {
		getElementById() {
			return makeButton('getAnswer');
		},
	};
	const calls = [];
	const handled = handleQuizKeyup(makeEvent('a', { matches: (selector) => selector === 'input, textarea, select' }), {
		document,
		isGameInProgress: () => true,
		actions: {
			questionAnswered: () => calls.push('answer'),
		},
	});
	console.assert(handled === false, 'Shortcuts should not fire from input fields.');
	console.assert(calls.length === 0, 'No game action should run from input fields.');
}
