import { I18n } from '../core/i18n.js';
import { escapeHTML, renderTags } from '../core/util.js';
import { QuizEngine } from '../quiz/quizEngine.js';
import { showToast } from './helpers.js';

const NOTES_WINDOW_NAME = 'ktron-mc-notes';
const NOTES_WINDOW_FEATURES = 'popup=yes,width=1080,height=810,left=80,top=80,resizable=yes,scrollbars=yes';

const popupStyles = `
html, body {
	margin: 0;
	padding: 0;
	min-height: 100%;
	background: #16181d;
	color: #f4f4f4;
	font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
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
}
#mc-notes-body {
	padding: 1.25rem 1.4rem 1.6rem;
	font-size: 1.25rem;
	line-height: 1.55;
	white-space: pre-wrap;
	word-wrap: break-word;
}
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
`;

export const McNotesPopup = {
	popup: null,
	enabled: false,
	unloadBound: false,

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
		this.enabled = QuizEngine.quizHasMcNotes();
		if (!this.enabled) {
			this.close();
			return;
		}
		this.open();
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
		this.update(QuizEngine.currentQuestion);
		popup.focus();
	},

	close() {
		if (this.isOpen()) {
			this.popup.close();
		}
		this.popup = null;
	},

	ensureDocument() {
		if (!this.isOpen()) {
			return false;
		}
		const doc = this.popup.document;
		if (doc.getElementById('mc-notes-body')) {
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
</body>
</html>`);
		doc.close();
		return Boolean(doc.getElementById('mc-notes-body'));
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
	},
};
