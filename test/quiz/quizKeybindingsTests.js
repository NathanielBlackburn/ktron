import { handleOverlayDismissKeyup, handleQuizKeyup, isQuizInputBlockedByOverlay } from '../../js/app/quizKeybindings.js';

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

const makeEvent = (key, target = { matches: () => false }, code = key.length === 1 ? `Key${key.toUpperCase()}` : key) => ({
	key,
	code,
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

console.log('Case 3b: h and f trigger half and one-and-a-half points when those buttons are visible.');

{
	const visible = new Set(['notAnswered', 'buttonHalf', 'buttonOneHalf']);
	const document = {
		getElementById(id) {
			return visible.has(id) ? makeButton(id) : null;
		},
	};
	const calls = [];
	const actions = {
		answeredCorrectly: (points) => calls.push(String(points)),
	};
	handleQuizKeyup(makeEvent('h'), { document, isGameInProgress: () => true, actions });
	handleQuizKeyup(makeEvent('F'), { document, isGameInProgress: () => true, actions });
	console.assert(calls.join() === '0.5,1.5', 'h and f should trigger 0.5 and 1.5 point scoring.');
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

console.log(padInfo('handleOverlayDismissKeyup tests'));

console.log('Case 5: Esc dismisses themed round announcement before cinema lights.');

{
	const calls = [];
	const document = {};
	const view = {
		isThemedRoundAnnouncementVisible: (doc) => {
			console.assert(doc === document, 'Themed round visibility should use the passed document.');
			return true;
		},
		dismissThemedRoundAnnouncement: (doc) => {
			console.assert(doc === document, 'Themed round dismiss should use the passed document.');
			calls.push('themed');
		},
		isCinemaLightsOut: () => true,
		lightSwitch: () => calls.push('cinema'),
	};
	const handled = handleOverlayDismissKeyup(makeEvent('Escape', undefined, 'Escape'), { document, view });
	console.assert(handled === true, 'Esc should be handled when an overlay is visible.');
	console.assert(calls.join() === 'themed', 'Themed round announcement should take priority over cinema lights.');
}

console.log('Case 6: Esc turns cinema lights back on when no themed round is showing.');

{
	const calls = [];
	const document = {};
	const view = {
		isThemedRoundAnnouncementVisible: () => false,
		dismissThemedRoundAnnouncement: () => calls.push('themed'),
		isCinemaLightsOut: (doc) => {
			console.assert(doc === document, 'Cinema lights visibility should use the passed document.');
			return true;
		},
		lightSwitch: (doc) => {
			console.assert(doc === document, 'Cinema lights toggle should use the passed document.');
			calls.push('cinema');
		},
	};
	const handled = handleOverlayDismissKeyup(makeEvent('Escape', undefined, 'Escape'), { document, view });
	console.assert(handled === true, 'Esc should dismiss cinema lights.');
	console.assert(calls.join() === 'cinema', 'Cinema lights should be toggled off.');
}

console.log('Case 7: Quiz shortcuts are blocked while an overlay is visible.');

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
	const view = {
		isThemedRoundAnnouncementVisible: () => true,
		isCinemaLightsOut: () => false,
	};
	const handled = handleQuizKeyup(makeEvent('a'), {
		document,
		isGameInProgress: () => true,
		actions: {
			questionAnswered: () => calls.push('answer'),
		},
		view,
	});
	console.assert(handled === false, 'Quiz shortcuts should not run while themed round overlay is visible.');
	console.assert(calls.length === 0, 'No game action should run while overlay is visible.');
}

console.log('Case 8: isQuizInputBlockedByOverlay is true for cinema lights or themed round.');

{
	const document = {};
	const view = {
		isThemedRoundAnnouncementVisible: () => false,
		isCinemaLightsOut: () => true,
	};
	console.assert(isQuizInputBlockedByOverlay(document, view) === true, 'Cinema lights should block quiz input.');
	view.isThemedRoundAnnouncementVisible = () => true;
	view.isCinemaLightsOut = () => false;
	console.assert(isQuizInputBlockedByOverlay(document, view) === true, 'Themed round overlay should block quiz input.');
	view.isThemedRoundAnnouncementVisible = () => false;
	console.assert(isQuizInputBlockedByOverlay(document, view) === false, 'Quiz input should be allowed when no overlay is visible.');
}
