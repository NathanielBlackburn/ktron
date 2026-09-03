import { I18n } from '../core/i18n.js';
import { escapeHTML, renderTags } from '../core/util.js';
import { QuizEngine } from '../quiz/quizEngine.js';
import { handleOverlayDismissKeyup, handleQuizKeyup, isQuizInputBlockedByOverlay } from '../app/quizKeybindings.js';
import { showToast } from './helpers.js';

const QUIZMASTER_WINDOW_NAME = 'ktron-quizmaster';
const QUIZMASTER_WINDOW_FEATURES = 'popup=yes,width=1080,height=810,left=80,top=80,resizable=yes,scrollbars=yes';

let quizmasterControlsLockTimer = null;

const getMainKTronWindow = () => (window.KTron ? window : window.opener);

const CONTROL_BUTTON_IDS = [
	'getAnswer',
	'notAnswered',
	'buttonHalf',
	'buttonOne',
	'buttonOneHalf',
	'buttonTwo',
	'endQuiz',
	'show-points',
	'cinema-light',
];

const buildControlButton = ({ id, label, cssClass, onclick }) => {
	const safeLabel = escapeHTML(label);
	const safeOnclick = escapeHTML(onclick);
	return `<button type="button" id="quizmaster-${id}" class="quizmaster-btn ${cssClass} hidden" onclick="${safeOnclick}">${safeLabel}</button>`;
};

const buildControlsHtml = () => {
	const openerCall = (path) => `(function(){var o=window.opener;if(o&&o.KTron){o.KTron.${path};}})()`;
	const answerBtn = buildControlButton({
		id: 'getAnswer',
		label: I18n.t('quiz.answer'),
		cssClass: 'quizmaster-btn-primary',
		onclick: openerCall('Game.questionAnswered()'),
	});
	const pointsBtns = [
		{ id: 'buttonHalf', label: '0.5', cssClass: 'quizmaster-btn-success', onclick: openerCall('Game.answeredCorrectly(0.5)') },
		{ id: 'buttonOne', label: '1', cssClass: 'quizmaster-btn-info', onclick: openerCall('Game.answeredCorrectly(1)') },
		{ id: 'buttonOneHalf', label: '1.5', cssClass: 'quizmaster-btn-primary', onclick: openerCall('Game.answeredCorrectly(1.5)') },
		{ id: 'buttonTwo', label: '2', cssClass: 'quizmaster-btn-warning', onclick: openerCall('Game.answeredCorrectly(2)') },
	].map(buildControlButton).join('');
	const notAnsweredBtn = buildControlButton({
		id: 'notAnswered',
		label: '0',
		cssClass: 'quizmaster-btn-danger',
		onclick: openerCall('Game.answeredIncorrectly()'),
	});
	const controlBtns = [
		{ id: 'endQuiz', label: I18n.t('quiz.end'), cssClass: 'quizmaster-btn-danger', onclick: openerCall('Game.endQuiz()') },
		{ id: 'show-points', label: I18n.t('modal.points.title'), cssClass: 'quizmaster-btn-primary', onclick: openerCall('View.togglePointsModal()') },
		{ id: 'cinema-light', label: '☀', cssClass: 'quizmaster-btn-dark', onclick: openerCall('View.lightSwitch()') },
	].map(buildControlButton).join('');
	return `<footer id="quizmaster-controls">
<div class="quizmaster-controls-row">${answerBtn}</div>
<div class="quizmaster-controls-row">${pointsBtns}</div>
<div class="quizmaster-controls-row quizmaster-controls-row--incorrect">${notAnsweredBtn}</div>
<div class="quizmaster-controls-row">${controlBtns}</div>
</footer>`;
};

const popupStyles = `
html, body {
	margin: 0;
	padding: 0;
	min-height: 100%;
	background: #16181d;
	color: #f4f4f4;
	font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
body {
	display: flex;
	flex-direction: column;
}
header {
	padding: 0.85rem 1.25rem;
	background: #0f1115;
	border-bottom: 1px solid #2c313a;
	font-size: 0.85rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: #c8ccd4;
	flex-shrink: 0;
}
#quizmaster-body {
	flex: 1 1 auto;
	padding: 1.25rem 1.4rem 1.6rem;
	font-size: 1.25rem;
	line-height: 1.55;
	white-space: pre-wrap;
	word-wrap: break-word;
}
#quizmaster-controls {
	flex-shrink: 0;
	padding: 1rem 1.4rem 1.4rem;
	border-top: 1px solid #2c313a;
	background: #0f1115;
}
.quizmaster-controls-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	justify-content: center;
	margin-bottom: 0.5rem;
}
.quizmaster-controls-row:last-child {
	margin-bottom: 0;
}
.quizmaster-controls-row--incorrect {
	padding-top: 0.35rem;
	margin-top: 0.15rem;
	border-top: 1px solid #2c313a;
}
#quizmaster-controls.quizmaster-controls--locked {
	pointer-events: none;
	opacity: 0.72;
}
.quizmaster-btn {
	border: none;
	border-radius: 0.4rem;
	padding: 0.55rem 1rem;
	font-size: 0.95rem;
	font-weight: 600;
	cursor: pointer;
	color: #fff;
}
.quizmaster-btn.hidden {
	display: none;
}
.quizmaster-btn-primary { background: #0d6efd; }
.quizmaster-btn-success { background: #198754; }
.quizmaster-btn-danger { background: #dc3545; }
.quizmaster-btn-info { background: #0dcaf0; color: #000; }
.quizmaster-btn-warning { background: #ffc107; color: #000; }
.quizmaster-btn-dark { background: #343a40; }
.quizmaster-btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
.quizmaster-empty {
	margin: 0;
	color: #8b919c;
	font-style: italic;
}
span.blue {
	color: #7eb6ff;
}
p.reverse {
	transform: rotateY(180deg);
}
#quizmaster-greeting-overlay {
	position: fixed;
	inset: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(15, 17, 21, 0.97);
	font-size: 4rem;
	font-weight: 800;
	letter-spacing: 0.04em;
	cursor: pointer;
	user-select: none;
}
#quizmaster-greeting-overlay.hidden {
	display: none;
}
`;

export const QuizmasterPopup = {
	popup: null,
	enabled: false,
	unloadBound: false,
	keyupHandler: null,

	openWindow(url, name, features) {
		return window.open(url, name, features);
	},

	bindUnload() {
		if (this.unloadBound || typeof window === 'undefined') {
			return;
		}
		window.addEventListener('beforeunload', () => this.close());
		this.unloadBound = true;
	},

	isOpen() {
		return Boolean(this.popup && !this.popup.closed);
	},

	start() {
		this.bindUnload();
		this.enabled = true;
		if (QuizEngine.quizHasQuizmasterNotes()) {
			this.open();
		}
	},

	stop() {
		this.enabled = false;
		this.close();
	},

	open() {
		if (!this.enabled) {
			return;
		}
		if (this.isOpen()) {
			this.popup.focus();
			this.bindQuizKeypress();
			this.update(QuizEngine.currentQuestion);
			return;
		}
		const popup = this.openWindow('', QUIZMASTER_WINDOW_NAME, QUIZMASTER_WINDOW_FEATURES);
		if (!popup) {
			showToast(I18n.t('quizmaster.popupBlocked'), 'warning');
			return;
		}
		this.popup = popup;
		this.ensureDocument();
		this.showGreetingOverlay();
		this.bindQuizKeypress();
		this.update(QuizEngine.currentQuestion);
		popup.focus();
	},

	showGreetingOverlay() {
		if (!this.isOpen()) {
			return;
		}
		const overlay = this.popup.document.getElementById('quizmaster-greeting-overlay');
		if (!overlay) {
			return;
		}
		overlay.classList.remove('hidden');
		overlay.onclick = () => {
			overlay.classList.add('hidden');
		};
	},

	close() {
		this.unbindQuizKeypress();
		if (this.isOpen()) {
			this.popup.close();
		}
		this.popup = null;
	},

	bindQuizKeypress() {
		if (!this.isOpen()) {
			return;
		}
		this.unbindQuizKeypress();
		this.keyupHandler = (event) => {
			if (event.target.matches('input, textarea, select')) {
				return;
			}
			const mainWindow = getMainKTronWindow();
			const ktron = mainWindow?.KTron;
			if (!ktron) {
				return;
			}
			if (handleOverlayDismissKeyup(event, { document: mainWindow.document, view: ktron.View })) {
				return;
			}
			if (isQuizInputBlockedByOverlay(mainWindow.document, ktron.View)) {
				return;
			}
			handleQuizKeyup(event, {
				document: mainWindow.document,
				isGameInProgress: () => QuizEngine.gameInProgress,
				actions: ktron.Game,
				view: ktron.View,
			});
		};
		this.popup.document.addEventListener('keyup', this.keyupHandler);
	},

	unbindQuizKeypress() {
		if (!this.keyupHandler) {
			return;
		}
		if (this.popup?.document) {
			this.popup.document.removeEventListener('keyup', this.keyupHandler);
		}
		this.keyupHandler = null;
	},

	ensureDocument() {
		if (!this.isOpen()) {
			return false;
		}
		const doc = this.popup.document;
		if (doc.getElementById('quizmaster-body') && doc.getElementById('quizmaster-controls')) {
			return true;
		}
		const title = escapeHTML(I18n.t('quizmaster.windowTitle'));
		doc.open();
		doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${popupStyles}</style>
</head>
<body>
<header>${title}</header>
<main id="quizmaster-body"></main>
${buildControlsHtml()}
<div id="quizmaster-greeting-overlay">Oi!</div>
</body>
</html>`);
		doc.close();
		return Boolean(doc.getElementById('quizmaster-body'));
	},

	syncControls() {
		if (!this.isOpen() || !this.ensureDocument() || typeof window === 'undefined') {
			return;
		}
		const mainDoc = window.document;
		const popupDoc = this.popup.document;
		CONTROL_BUTTON_IDS.forEach((id) => {
			const mainEl = mainDoc.getElementById(id);
			const popupEl = popupDoc.getElementById(`quizmaster-${id}`);
			if (!mainEl || !popupEl) {
				return;
			}
			let visible = !mainEl.classList.contains('d-none');
			if (id === 'endQuiz') {
				const endPane = mainDoc.getElementById('quiz-end-pane');
				visible = !!endPane && !endPane.classList.contains('d-none');
				popupEl.disabled = mainEl.disabled;
			}
			popupEl.classList.toggle('hidden', !visible);
		});
	},

	lockControls(durationMs = 450) {
		if (!this.isOpen() || !this.ensureDocument()) {
			return;
		}
		const controls = this.popup.document.getElementById('quizmaster-controls');
		if (!controls) {
			return;
		}
		controls.classList.add('quizmaster-controls--locked');
		if (quizmasterControlsLockTimer) {
			clearTimeout(quizmasterControlsLockTimer);
		}
		quizmasterControlsLockTimer = setTimeout(() => {
			controls.classList.remove('quizmaster-controls--locked');
			quizmasterControlsLockTimer = null;
		}, durationMs);
	},

	update(question) {
		if (!this.enabled || !this.isOpen() || !this.ensureDocument()) {
			return;
		}
		const body = this.popup.document.getElementById('quizmaster-body');
		if (!body) {
			return;
		}
		const notes = QuizEngine.getQuizmasterNotes(question);
		if (notes) {
			body.innerHTML = renderTags(notes);
		} else {
			body.innerHTML = `<p class="quizmaster-empty">${escapeHTML(I18n.t('quizmaster.empty'))}</p>`;
		}
		this.popup.document.title = I18n.t('quizmaster.windowTitle');
		this.syncControls();
	},
};
