import { mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyQuizmasterNotesFromRecord } from '../../tools/ciamk.js';

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

console.log(padInfo('applyQuizmasterNotesFromRecord tests'));

console.log('Case 1: Non-empty quizmasterNotes is mapped onto the question.');

{
	const question = makeQuestion('001');
	applyQuizmasterNotesFromRecord(question, { quizmasterNotes: ' Host hint ' });
	console.assert(question.quizmasterNotes === 'Host hint', 'Trimmed quizmasterNotes should be stored on the question.');
}

console.log('Case 2: Missing or blank quizmasterNotes is ignored.');

{
	const withoutColumn = makeQuestion('002');
	applyQuizmasterNotesFromRecord(withoutColumn, { question: 'Q' });
	console.assert(typeof withoutColumn.quizmasterNotes === 'undefined', 'Missing quizmasterNotes should not add the field.');

	const blank = makeQuestion('003');
	applyQuizmasterNotesFromRecord(blank, { quizmasterNotes: '   ' });
	console.assert(typeof blank.quizmasterNotes === 'undefined', 'Blank quizmasterNotes should not add the field.');
}

const toasts = [];

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

mock.module(fileURLToPath(new URL('../../js/core/util.js', import.meta.url)), {
	namedExports: {
		escapeHTML: (text) => text,
		renderTags: (text) => text,
	},
});

mock.module(fileURLToPath(new URL('../../js/ui/helpers.js', import.meta.url)), {
	namedExports: {
		showToast: (text) => {
			toasts.push(text);
		},
	},
});

const { QuizEngine } = await import('../../js/quiz/quizEngine.js');
const { QuizmasterPopup } = await import('../../js/ui/quizmasterPopup.js');

console.log(padInfo('QuizEngine.quizHasQuizmasterNotes tests'));

console.log('Case 1: Returns false when no question has notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { quizmasterNotes: '   ' })];
	console.assert(QuizEngine.quizHasQuizmasterNotes() === false, 'Blank notes should not count as present.');
}

console.log('Case 2: Returns true when at least one question has notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { quizmasterNotes: 'Hint' })];
	console.assert(QuizEngine.quizHasQuizmasterNotes() === true, 'A non-empty quizmasterNotes field should enable notes.');
}

const createMockClassList = (initial = []) => {
	const classes = new Set(initial);
	return {
		contains(className) {
			return classes.has(className);
		},
		toggle(className, force) {
			if (force === undefined) {
				if (classes.has(className)) {
					classes.delete(className);
				} else {
					classes.add(className);
				}
				return;
			}
			if (force) {
				classes.add(className);
			} else {
				classes.delete(className);
			}
		},
	};
};

const createMockPopup = () => {
	const elements = {};
	const listeners = {};
	return {
		closed: false,
		focused: false,
		document: {
			title: '',
			open() {},
			write() {
				elements['quizmaster-body'] = { innerHTML: '' };
				elements['quizmaster-controls'] = {};
			},
			close() {},
			getElementById(id) {
				return elements[id] || null;
			},
			addEventListener(type, handler) {
				listeners[type] = handler;
			},
			removeEventListener(type, handler) {
				if (listeners[type] === handler) {
					delete listeners[type];
				}
			},
		},
		addControlButton(id) {
			elements[`quizmaster-${id}`] = { classList: createMockClassList(['hidden']) };
		},
		focus() {
			this.focused = true;
		},
		close() {
			this.closed = true;
		},
	};
};

console.log(padInfo('QuizmasterPopup tests'));

console.log('Case 1: start() does not auto-open a window when the quiz has no notes.');

{
	QuizmasterPopup.popup = null;
	QuizmasterPopup.enabled = false;
	QuizmasterPopup.openWindow = () => {
		throw new Error('window.open should not be called when quiz has no notes');
	};
	QuizEngine.questions = [makeQuestion('001')];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	QuizmasterPopup.start();
	console.assert(QuizmasterPopup.enabled === true, 'Quizmaster popup should be enabled during a game without notes.');
	console.assert(QuizmasterPopup.popup === null, 'Quizmaster popup should not auto-open without notes.');
}

console.log('Case 2: start() opens a window and shows notes for the current question.');

{
	const popup = createMockPopup();
	QuizmasterPopup.popup = null;
	QuizmasterPopup.enabled = false;
	QuizmasterPopup.openWindow = () => popup;
	QuizEngine.questions = [
		makeQuestion('001', { quizmasterNotes: 'First hint' }),
		makeQuestion('002'),
	];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	QuizmasterPopup.start();
	console.assert(QuizmasterPopup.enabled === true, 'Quizmaster popup should be enabled when quiz has notes.');
	console.assert(QuizmasterPopup.popup === popup, 'Quizmaster popup should store the opened window.');
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === 'First hint', 'Popup should show current question notes.');
}

console.log('Case 3: update() refreshes notes and ignores a closed window.');

{
	const popup = createMockPopup();
	popup.document.write();
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.update(makeQuestion('002', { quizmasterNotes: 'Second hint' }));
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === 'Second hint', 'Open popup should update with the new question notes.');

	popup.closed = true;
	QuizmasterPopup.update(makeQuestion('003', { quizmasterNotes: 'Should not appear' }));
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === 'Second hint', 'Closed popup should not be updated or reopened.');
}

console.log('Case 4: open() reopens a closed window; stop() closes it.');

{
	let opened = 0;
	const popup = createMockPopup();
	QuizmasterPopup.popup = { closed: true, document: { getElementById: () => null } };
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.openWindow = () => {
		opened += 1;
		return popup;
	};
	QuizEngine.currentQuestion = makeQuestion('004', { quizmasterNotes: 'Reopened hint' });
	QuizmasterPopup.open();
	console.assert(opened === 1, 'Shift+M should open a new window after the popup was closed.');
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === 'Reopened hint', 'Reopened popup should show current notes.');

	QuizmasterPopup.stop();
	console.assert(popup.closed === true, 'stop() should close the Quizmaster window.');
	console.assert(QuizmasterPopup.enabled === false, 'stop() should disable the Quizmaster popup.');
	console.assert(QuizmasterPopup.popup === null, 'stop() should drop the window reference.');
}

console.log('Case 5: A question without notes shows the empty message.');

{
	const popup = createMockPopup();
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.openWindow = () => popup;
	QuizmasterPopup.update(makeQuestion('005'));
	console.assert(
		popup.document.getElementById('quizmaster-body').innerHTML.includes('quizmaster.empty'),
		'Questions without quizmaster notes should show the empty-notes message.',
	);
	QuizmasterPopup.stop();
}

console.log('Case 6: open() works manually when the quiz has no notes.');

{
	const popup = createMockPopup();
	popup.document.write();
	QuizmasterPopup.popup = null;
	QuizmasterPopup.enabled = false;
	QuizmasterPopup.openWindow = () => popup;
	QuizEngine.questions = [makeQuestion('006')];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	QuizmasterPopup.start();
	QuizmasterPopup.open();
	console.assert(QuizmasterPopup.popup === popup, 'Shift+M should open Quizmaster even without notes in the quiz.');
	console.assert(
		popup.document.getElementById('quizmaster-body').innerHTML.includes('quizmaster.empty'),
		'Manual open without notes should show the empty-notes message.',
	);
	QuizmasterPopup.stop();
}

console.log('Case 7: syncControls mirrors main window button visibility.');

{
	const popup = createMockPopup();
	popup.document.write();
	['getAnswer', 'endQuiz', 'buttonOne'].forEach((id) => popup.addControlButton(id));
	const mainElements = {
		getAnswer: { classList: createMockClassList() },
		endQuiz: { classList: createMockClassList(['d-none']) },
		buttonOne: { classList: createMockClassList(['d-none']) },
	};
	const previousWindow = globalThis.window;
	globalThis.window = {
		document: {
			getElementById(id) {
				return mainElements[id] || null;
			},
		},
	};
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.syncControls();
	console.assert(
		!popup.document.getElementById('quizmaster-getAnswer').classList.contains('hidden'),
		'Visible main buttons should appear in the Quizmaster popup.',
	);
	console.assert(
		popup.document.getElementById('quizmaster-endQuiz').classList.contains('hidden'),
		'Hidden main buttons should stay hidden in the Quizmaster popup.',
	);
	globalThis.window = previousWindow;
	QuizmasterPopup.popup = null;
}
