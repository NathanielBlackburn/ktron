import { mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyMcNotesFromRecord } from '../../tools/ciamk.js';

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

console.log(padInfo('applyMcNotesFromRecord tests'));

console.log('Case 1: Non-empty mcNotes is mapped onto the question.');

{
	const question = makeQuestion('001');
	applyMcNotesFromRecord(question, { mcNotes: ' Host hint ' });
	console.assert(question.mcNotes === 'Host hint', 'Trimmed mcNotes should be stored on the question.');
}

console.log('Case 2: Missing or blank mcNotes is ignored.');

{
	const withoutColumn = makeQuestion('002');
	applyMcNotesFromRecord(withoutColumn, { question: 'Q' });
	console.assert(typeof withoutColumn.mcNotes === 'undefined', 'Missing mcNotes should not add the field.');

	const blank = makeQuestion('003');
	applyMcNotesFromRecord(blank, { mcNotes: '   ' });
	console.assert(typeof blank.mcNotes === 'undefined', 'Blank mcNotes should not add the field.');
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
const { McNotesPopup } = await import('../../js/ui/mcNotesPopup.js');

console.log(padInfo('QuizEngine.quizHasMcNotes tests'));

console.log('Case 1: Returns false when no question has notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { mcNotes: '   ' })];
	console.assert(QuizEngine.quizHasMcNotes() === false, 'Blank notes should not count as present.');
}

console.log('Case 2: Returns true when at least one question has notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { mcNotes: 'Hint' })];
	console.assert(QuizEngine.quizHasMcNotes() === true, 'A non-empty mcNotes field should enable notes.');
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
				elements['mc-notes-body'] = { innerHTML: '' };
				elements['mc-notes-controls'] = {};
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
			elements[`mc-notes-${id}`] = { classList: createMockClassList(['hidden']) };
		},
		focus() {
			this.focused = true;
		},
		close() {
			this.closed = true;
		},
	};
};

console.log(padInfo('McNotesPopup tests'));

console.log('Case 1: start() does not auto-open a window when the quiz has no notes.');

{
	McNotesPopup.popup = null;
	McNotesPopup.enabled = false;
	McNotesPopup.openWindow = () => {
		throw new Error('window.open should not be called when quiz has no notes');
	};
	QuizEngine.questions = [makeQuestion('001')];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	McNotesPopup.start();
	console.assert(McNotesPopup.enabled === true, 'Notes popup should be enabled during a game without mcNotes.');
	console.assert(McNotesPopup.popup === null, 'Notes popup should not auto-open without mcNotes.');
}

console.log('Case 2: start() opens a window and shows notes for the current question.');

{
	const popup = createMockPopup();
	McNotesPopup.popup = null;
	McNotesPopup.enabled = false;
	McNotesPopup.openWindow = () => popup;
	QuizEngine.questions = [
		makeQuestion('001', { mcNotes: 'First hint' }),
		makeQuestion('002'),
	];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	McNotesPopup.start();
	console.assert(McNotesPopup.enabled === true, 'Notes popup should be enabled when quiz has mcNotes.');
	console.assert(McNotesPopup.popup === popup, 'Notes popup should store the opened window.');
	console.assert(popup.document.getElementById('mc-notes-body').innerHTML === 'First hint', 'Popup should show current question notes.');
}

console.log('Case 3: update() refreshes notes and ignores a closed window.');

{
	const popup = createMockPopup();
	popup.document.write();
	McNotesPopup.popup = popup;
	McNotesPopup.enabled = true;
	McNotesPopup.update(makeQuestion('002', { mcNotes: 'Second hint' }));
	console.assert(popup.document.getElementById('mc-notes-body').innerHTML === 'Second hint', 'Open popup should update with the new question notes.');

	popup.closed = true;
	McNotesPopup.update(makeQuestion('003', { mcNotes: 'Should not appear' }));
	console.assert(popup.document.getElementById('mc-notes-body').innerHTML === 'Second hint', 'Closed popup should not be updated or reopened.');
}

console.log('Case 4: open() reopens a closed window; stop() closes it.');

{
	let opened = 0;
	const popup = createMockPopup();
	McNotesPopup.popup = { closed: true, document: { getElementById: () => null } };
	McNotesPopup.enabled = true;
	McNotesPopup.openWindow = () => {
		opened += 1;
		return popup;
	};
	QuizEngine.currentQuestion = makeQuestion('004', { mcNotes: 'Reopened hint' });
	McNotesPopup.open();
	console.assert(opened === 1, 'Shift+N should open a new window after the popup was closed.');
	console.assert(popup.document.getElementById('mc-notes-body').innerHTML === 'Reopened hint', 'Reopened popup should show current notes.');

	McNotesPopup.stop();
	console.assert(popup.closed === true, 'stop() should close the notes window.');
	console.assert(McNotesPopup.enabled === false, 'stop() should disable the notes popup.');
	console.assert(McNotesPopup.popup === null, 'stop() should drop the window reference.');
}

console.log('Case 5: A question without notes shows the empty message.');

{
	const popup = createMockPopup();
	McNotesPopup.popup = popup;
	McNotesPopup.enabled = true;
	McNotesPopup.openWindow = () => popup;
	McNotesPopup.update(makeQuestion('005'));
	console.assert(
		popup.document.getElementById('mc-notes-body').innerHTML.includes('mcNotes.empty'),
		'Questions without mcNotes should show the empty-notes message.',
	);
	McNotesPopup.stop();
}

console.log('Case 6: open() works manually when the quiz has no mcNotes.');

{
	const popup = createMockPopup();
	popup.document.write();
	McNotesPopup.popup = null;
	McNotesPopup.enabled = false;
	McNotesPopup.openWindow = () => popup;
	QuizEngine.questions = [makeQuestion('006')];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	McNotesPopup.start();
	McNotesPopup.open();
	console.assert(McNotesPopup.popup === popup, 'Shift+N should open notes even without mcNotes in the quiz.');
	console.assert(
		popup.document.getElementById('mc-notes-body').innerHTML.includes('mcNotes.empty'),
		'Manual open without mcNotes should show the empty-notes message.',
	);
	McNotesPopup.stop();
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
	McNotesPopup.popup = popup;
	McNotesPopup.syncControls();
	console.assert(
		!popup.document.getElementById('mc-notes-getAnswer').classList.contains('hidden'),
		'Visible main buttons should appear in the notes popup.',
	);
	console.assert(
		popup.document.getElementById('mc-notes-endQuiz').classList.contains('hidden'),
		'Hidden main buttons should stay hidden in the notes popup.',
	);
	globalThis.window = previousWindow;
	McNotesPopup.popup = null;
}
