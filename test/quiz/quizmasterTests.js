import { mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyCategoryNotesToQuestions, applyQuestionNotesFromRecord, parseCategoryNotesFromRecords } from '../../tools/ciamk.js';

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

console.log(padInfo('applyQuestionNotesFromRecord tests'));

console.log('Case 1: Non-empty questionNotes is mapped onto the question as qmQuestionNotes.');

{
	const question = makeQuestion('001');
	applyQuestionNotesFromRecord(question, { questionNotes: ' Host hint ' });
	console.assert(question.qmQuestionNotes === 'Host hint', 'Trimmed questionNotes should be stored as qmQuestionNotes.');
}

console.log('Case 2: Missing or blank questionNotes is ignored.');

{
	const withoutColumn = makeQuestion('002');
	applyQuestionNotesFromRecord(withoutColumn, { question: 'Q' });
	console.assert(typeof withoutColumn.qmQuestionNotes === 'undefined', 'Missing questionNotes should not add the field.');

	const blank = makeQuestion('003');
	applyQuestionNotesFromRecord(blank, { questionNotes: '   ' });
	console.assert(typeof blank.qmQuestionNotes === 'undefined', 'Blank questionNotes should not add the field.');
}

console.log(padInfo('parseCategoryNotesFromRecords tests'));

console.log('Case 1: First non-empty categoryNotes per category wins.');

{
	const records = [
		{ category: 'Literatura', categoryNotes: ' Lit notes A ' },
		{ category: 'Literatura', categoryNotes: 'Lit notes B' },
		{ category: 'Geografia', categoryNotes: 'Geo notes' },
		{ category: 'Historia', categoryNotes: '   ' },
	];
	const { categoryNotes, errors } = parseCategoryNotesFromRecords(records);
	console.assert(errors.length === 0, 'Valid category notes should not produce errors.');
	console.assert(categoryNotes.Literatura === 'Lit notes A', 'First notes for Literatura should win.');
	console.assert(categoryNotes.Geografia === 'Geo notes', 'Geografia notes should be parsed.');
	console.assert(typeof categoryNotes.Historia === 'undefined', 'Blank categoryNotes should be ignored.');
}

console.log('Case 2: categoryNotes without category produces an error.');

{
	const { categoryNotes, errors } = parseCategoryNotesFromRecords([{ categoryNotes: 'Orphan notes' }]);
	console.assert(Object.keys(categoryNotes).length === 0, 'Notes without category should not be stored.');
	console.assert(errors.some((error) => error.includes('bez kategorii')), 'Notes without category should produce an error.');
}

console.log(padInfo('applyCategoryNotesToQuestions tests'));

console.log('Case 1: First category notes are copied onto every question in that category.');

{
	const questions = [
		makeQuestion('001', { category: 'Literatura' }),
		makeQuestion('002', { category: 'Literatura' }),
		makeQuestion('003', { category: 'Geografia' }),
		makeQuestion('004'),
	];
	applyCategoryNotesToQuestions(questions, {
		Literatura: 'Lit notes',
		Geografia: 'Geo notes',
	});
	console.assert(questions[0].qmCategoryNotes === 'Lit notes', 'First Literatura question should get category notes.');
	console.assert(questions[1].qmCategoryNotes === 'Lit notes', 'Later Literatura questions should get the same category notes.');
	console.assert(questions[2].qmCategoryNotes === 'Geo notes', 'Geografia question should get its category notes.');
	console.assert(typeof questions[3].qmCategoryNotes === 'undefined', 'Questions without a category should not get category notes.');
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

const questionNotesHtml = (text) => `<div class="quizmaster-question-notes">${text}</div>`;
const categoryNotesHtml = (text) => `<div class="quizmaster-category-notes">${text}</div>`;

console.log(padInfo('QuizEngine.quizHasQuizmasterNotes tests'));

console.log('Case 1: Returns false when no question has notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { qmQuestionNotes: '   ' })];
	console.assert(QuizEngine.quizHasQuizmasterNotes() === false, 'Blank notes should not count as present.');
}

console.log('Case 2: Returns true when at least one question has question notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { qmQuestionNotes: 'Hint' })];
	console.assert(QuizEngine.quizHasQuizmasterNotes() === true, 'A non-empty qmQuestionNotes field should enable notes.');
}

console.log('Case 3: Returns true when at least one question has category notes.');

{
	QuizEngine.questions = [makeQuestion('001'), makeQuestion('002', { qmCategoryNotes: 'Category hint' })];
	console.assert(QuizEngine.quizHasQuizmasterNotes() === true, 'A non-empty qmCategoryNotes field should enable notes.');
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
		getListener(type) {
			return listeners[type];
		},
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
		makeQuestion('001', { qmQuestionNotes: 'First hint' }),
		makeQuestion('002'),
	];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	QuizmasterPopup.start();
	console.assert(QuizmasterPopup.enabled === true, 'Quizmaster popup should be enabled when quiz has notes.');
	console.assert(QuizmasterPopup.popup === popup, 'Quizmaster popup should store the opened window.');
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === questionNotesHtml('First hint'), 'Popup should show current question notes.');
}

console.log('Case 3: update() refreshes notes and ignores a closed window.');

{
	const popup = createMockPopup();
	popup.document.write();
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.update(makeQuestion('002', { qmQuestionNotes: 'Second hint' }));
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === questionNotesHtml('Second hint'), 'Open popup should update with the new question notes.');

	popup.closed = true;
	QuizmasterPopup.update(makeQuestion('003', { qmQuestionNotes: 'Should not appear' }));
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === questionNotesHtml('Second hint'), 'Closed popup should not be updated or reopened.');
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
	QuizEngine.currentQuestion = makeQuestion('004', { qmQuestionNotes: 'Reopened hint' });
	QuizmasterPopup.open();
	console.assert(opened === 1, 'Shift+M should open a new window after the popup was closed.');
	console.assert(popup.document.getElementById('quizmaster-body').innerHTML === questionNotesHtml('Reopened hint'), 'Reopened popup should show current notes.');

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

console.log('Case 8: t key in the Quizmaster window toggles alt images on the main display.');

{
	const popup = createMockPopup();
	popup.document.write();
	const altCalls = [];
	const previousWindow = globalThis.window;
	const previousCode = QuizEngine.code;
	globalThis.window = {
		KTron: {
			View: {
				isThemedRoundAnnouncementVisible: () => true,
				isCinemaLightsOut: () => false,
				setShownImageAlt: (showAlt) => altCalls.push(showAlt),
			},
			Game: {},
		},
		document: {
			getElementById() {
				return null;
			},
		},
	};
	QuizEngine.code = 'test-quiz';
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.bindQuizKeypress();
	const tEvent = {
		key: 't',
		code: 'KeyT',
		target: { matches: () => false },
	};
	popup.getListener('keydown')(tEvent);
	popup.getListener('keyup')(tEvent);
	console.assert(altCalls.join() === 'true,false', 'Holding t in Quizmaster should show then hide the alt image, including during a themed round cover.');
	QuizmasterPopup.unbindQuizKeypress();
	QuizmasterPopup.popup = null;
	QuizEngine.code = previousCode;
	globalThis.window = previousWindow;
}

console.log('Case 9: Category notes are shown under question notes.');

{
	const popup = createMockPopup();
	popup.document.write();
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.update(makeQuestion('009', {
		qmQuestionNotes: 'Question hint',
		qmCategoryNotes: 'Category hint',
	}));
	console.assert(
		popup.document.getElementById('quizmaster-body').innerHTML ===
			questionNotesHtml('Question hint') + categoryNotesHtml('Category hint'),
		'Category notes should appear under question notes.',
	);
	QuizmasterPopup.stop();
}

console.log('Case 10: Category notes alone are shown without the empty message.');

{
	const popup = createMockPopup();
	popup.document.write();
	QuizmasterPopup.popup = popup;
	QuizmasterPopup.enabled = true;
	QuizmasterPopup.update(makeQuestion('010', { qmCategoryNotes: 'Only category hint' }));
	console.assert(
		popup.document.getElementById('quizmaster-body').innerHTML === categoryNotesHtml('Only category hint'),
		'Category notes should display even when the question has no question notes.',
	);
	QuizmasterPopup.stop();
}

console.log('Case 11: start() auto-opens when the quiz only has category notes.');

{
	const popup = createMockPopup();
	QuizmasterPopup.popup = null;
	QuizmasterPopup.enabled = false;
	QuizmasterPopup.openWindow = () => popup;
	QuizEngine.questions = [
		makeQuestion('011', { qmCategoryNotes: 'Shared category hint' }),
		makeQuestion('012'),
	];
	QuizEngine.currentQuestion = QuizEngine.questions[0];
	QuizmasterPopup.start();
	console.assert(QuizmasterPopup.popup === popup, 'Quizmaster popup should auto-open when only category notes are present.');
	console.assert(
		popup.document.getElementById('quizmaster-body').innerHTML === categoryNotesHtml('Shared category hint'),
		'Auto-opened popup should show the category notes.',
	);
	QuizmasterPopup.stop();
}
