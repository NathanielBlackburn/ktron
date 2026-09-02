import { I18n } from '../core/i18n.js';
import { escapeHTML, renderTags } from '../core/util.js';
import { QuizEngine } from '../quiz/quizEngine.js';
import { handleQuizKeyup } from '../app/quizKeybindings.js';
import { showToast } from './helpers.js';

const NOTES_WINDOW_NAME = 'ktron-mc-notes';
const NOTES_WINDOW_FEATURES = 'popup=yes,width=1080,height=810,left=80,top=80,resizable=yes,scrollbars=yes';

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
	return `<button type="button" id="mc-notes-${id}" class="mc-notes-btn ${cssClass} hidden" onclick="${safeOnclick}">${safeLabel}</button>`;
};

const buildControlsHtml = () => {
	const openerCall = (path) => `(function(){var o=window.opener;if(o&&o.KTron){o.KTron.${path};}})()`;
	const answerBtn = buildControlButton({
		id: 'getAnswer',
		label: I18n.t('quiz.answer'),
		cssClass: 'mc-notes-btn-primary',
		onclick: openerCall('Game.questionAnswered()'),
	});
	const pointsBtns = [
		{ id: 'notAnswered', label: '0', cssClass: 'mc-notes-btn-danger', onclick: openerCall('Game.answeredIncorrectly()') },
		{ id: 'buttonHalf', label: '0.5', cssClass: 'mc-notes-btn-success', onclick: openerCall('Game.answeredCorrectly(0.5)') },
		{ id: 'buttonOne', label: '1', cssClass: 'mc-notes-btn-primary', onclick: openerCall('Game.answeredCorrectly(1)') },
		{ id: 'buttonOneHalf', label: '1.5', cssClass: 'mc-notes-btn-info', onclick: openerCall('Game.answeredCorrectly(1.5)') },
		{ id: 'buttonTwo', label: '2', cssClass: 'mc-notes-btn-warning', onclick: openerCall('Game.answeredCorrectly(2)') },
	].map(buildControlButton).join('');
	const controlBtns = [
		{ id: 'endQuiz', label: I18n.t('quiz.end'), cssClass: 'mc-notes-btn-danger', onclick: openerCall('Game.endQuiz()') },
		{ id: 'show-points', label: I18n.t('modal.points.title'), cssClass: 'mc-notes-btn-primary', onclick: openerCall('View.togglePointsModal()') },
		{ id: 'cinema-light', label: '☀', cssClass: 'mc-notes-btn-dark', onclick: openerCall('View.lightSwitch()') },
	].map(buildControlButton).join('');
	return `<footer id="mc-notes-controls">
<div class="mc-notes-controls-row">${answerBtn}</div>
<div class="mc-notes-controls-row">${pointsBtns}</div>
<div class="mc-notes-controls-row">${controlBtns}</div>
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
#mc-notes-body {
	flex: 1 1 auto;
	padding: 1.25rem 1.4rem 1.6rem;
	font-size: 1.25rem;
	line-height: 1.55;
	white-space: pre-wrap;
	word-wrap: break-word;
}
#mc-notes-controls {
	flex-shrink: 0;
	padding: 1rem 1.4rem 1.4rem;
	border-top: 1px solid #2c313a;
	background: #0f1115;
}
.mc-notes-controls-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	justify-content: center;
	margin-bottom: 0.5rem;
}
.mc-notes-controls-row:last-child {
	margin-bottom: 0;
}
.mc-notes-btn {
	border: none;
	border-radius: 0.4rem;
	padding: 0.55rem 1rem;
	font-size: 0.95rem;
	font-weight: 600;
	cursor: pointer;
	color: #fff;
}
.mc-notes-btn.hidden {
	display: none;
}
.mc-notes-btn-primary { background: #0d6efd; }
.mc-notes-btn-success { background: #198754; }
.mc-notes-btn-danger { background: #dc3545; }
.mc-notes-btn-info { background: #0dcaf0; color: #000; }
.mc-notes-btn-warning { background: #ffc107; color: #000; }
.mc-notes-btn-dark { background: #343a40; }
.mc-notes-empty {
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
#mc-notes-greeting-overlay {
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
#mc-notes-greeting-overlay.hidden {
	display: none;
}
`;

export const McNotesPopup = {
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
		if (QuizEngine.quizHasMcNotes()) {
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
		const popup = this.openWindow('', NOTES_WINDOW_NAME, NOTES_WINDOW_FEATURES);
		if (!popup) {
			showToast(I18n.t('mcNotes.popupBlocked'), 'warning');
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
		const overlay = this.popup.document.getElementById('mc-notes-greeting-overlay');
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
			handleQuizKeyup(event, {
				document: window.document,
				isGameInProgress: () => QuizEngine.gameInProgress,
				actions: window.KTron?.Game,
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
		if (doc.getElementById('mc-notes-body') && doc.getElementById('mc-notes-controls')) {
			return true;
		}
		const title = escapeHTML(I18n.t('mcNotes.windowTitle'));
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
<main id="mc-notes-body"></main>
${buildControlsHtml()}
<div id="mc-notes-greeting-overlay">Oi!</div>
</body>
</html>`);
		doc.close();
		return Boolean(doc.getElementById('mc-notes-body'));
	},

	syncControls() {
		if (!this.isOpen() || !this.ensureDocument() || typeof window === 'undefined') {
			return;
		}
		const mainDoc = window.document;
		const popupDoc = this.popup.document;
		CONTROL_BUTTON_IDS.forEach((id) => {
			const mainEl = mainDoc.getElementById(id);
			const popupEl = popupDoc.getElementById(`mc-notes-${id}`);
			if (!mainEl || !popupEl) {
				return;
			}
			const visible = !mainEl.classList.contains('d-none');
			popupEl.classList.toggle('hidden', !visible);
		});
	},

	update(question) {
		if (!this.enabled || !this.isOpen() || !this.ensureDocument()) {
			return;
		}
		const body = this.popup.document.getElementById('mc-notes-body');
		if (!body) {
			return;
		}
		const notes = typeof question?.mcNotes === 'string' ? question.mcNotes.trim() : '';
		if (notes) {
			body.innerHTML = renderTags(notes);
		} else {
			body.innerHTML = `<p class="mc-notes-empty">${escapeHTML(I18n.t('mcNotes.empty'))}</p>`;
		}
		this.popup.document.title = I18n.t('mcNotes.windowTitle');
		this.syncControls();
	},
};
