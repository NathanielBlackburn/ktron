import '../core/setupGlobals.js';
import { Loader } from '../core/config.js';
import { DB } from '../core/db.js';
import { QuizEngine } from '../quiz/quizEngine.js';
import { I18n, i18nReady, initI18n } from '../core/i18n.js';
import { showToast } from '../ui/helpers.js';
import { View } from '../ui/ui.js';
import { QuizmasterPopup } from '../ui/quizmasterPopup.js';
import { Game } from './game.js';
import { handleOverlayDismissKeyup, handleQuizKeyup, isQuizInputBlockedByOverlay } from './quizKeybindings.js';

const finishQuizLoading = () => {
	Loader.quizzesReady = true;
	i18nReady.then(() => init());
};

const loadScript = (code) => {
	const script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = `pytania/${code}/${code}.js`;
	jQuery(script).on('load', function () {
		Loader.scriptsLoaded += 1;
		if (Loader.scriptsLoaded == Loader.scriptsToLoad) {
			finishQuizLoading();
		}
	});
	document.head.appendChild(script);
};

const loadQuestions = () => {
	const codes = Loader.config?.quizFiles;
	if (!codes?.length) {
		return;
	}
	Loader.scriptsToLoad = codes.length;
	Loader.scriptsLoaded = 0;
	for (const code of codes) {
		loadScript(code);
	}
};

const QUIZ_MANIFEST_URL = 'js/quizFiles.js';

const parseQuizManifestText = (text) => {
	const windowAssign = text.match(/window\.ktronQuizFiles\s*=\s*(\[[\s\S]*?\])\s*;/);
	if (windowAssign) {
		return JSON.parse(windowAssign[1]);
	}
	const exported = text.match(/(?:export\s+)?const\s+ktronQuizFiles\s*=\s*(\[[\s\S]*?\])\s*;/);
	if (exported) {
		return JSON.parse(exported[1]);
	}
	const legacy = text.match(/\[[\s\S]*\]/);
	return legacy ? JSON.parse(legacy[0]) : [];
};

const loadQuizManifestViaScript = () => {
	return new Promise((resolve) => {
		const script = document.createElement('script');
		script.async = true;
		script.src = QUIZ_MANIFEST_URL;
		script.onload = () => {
			if (Array.isArray(window.ktronQuizFiles)) {
				Loader.config.quizFiles = [...window.ktronQuizFiles];
			}
			delete window.ktronQuizFiles;
			resolve();
		};
		script.onerror = () => {
			Loader.config.quizFiles = [];
			resolve();
		};
		document.head.appendChild(script);
	});
};

const loadQuizManifest = () => {
	return fetch(QUIZ_MANIFEST_URL)
		.then((response) => (response.ok ? response.text() : Promise.reject()))
		.then((text) => {
			Loader.config.quizFiles = parseQuizManifestText(text);
		})
		.catch(() => loadQuizManifestViaScript());
};

export const App = {
	bindKeypress() {
		jQuery(document).on('keydown', (event) => {
			if (event.target.matches('input, textarea, select')) {
				return;
			}
			if (isQuizInputBlockedByOverlay(window.document, View)) {
				return;
			}
			if (event.key === 't' && QuizEngine.gameInProgress) {
				View.setShownImageAlt(true);
			}
		});
		jQuery(document).on('keyup', (event) => {
			if (event.target.matches('input, textarea, select')) {
				return;
			}
			if (handleOverlayDismissKeyup(event, { document: window.document, view: View })) {
				return;
			}
			if (isQuizInputBlockedByOverlay(window.document, View)) {
				return;
			}
			if (event.key === 't' && QuizEngine.gameInProgress) {
				View.setShownImageAlt(false);
			}
			if (event.shiftKey && event.code == 'KeyP' && QuizEngine.gameInProgress) {
				View.togglePointsModal();
			} else if (event.shiftKey && event.code == 'KeyM' && QuizEngine.gameInProgress) {
				QuizmasterPopup.open();
			} else if (event.shiftKey && event.altKey && event.code == 'KeyQ') {
				if (confirm(I18n.t('confirm.easterEgg'))) {
					DB.purge();
				}
			} else if (QuizEngine.gameInProgress) {
				handleQuizKeyup(event, {
					document: window.document,
					isGameInProgress: () => QuizEngine.gameInProgress,
					actions: Game,
					view: View,
				});
			}
		});
		jQuery('#player-add-name').on('keyup', (event) => {
			if (event.code == 'Escape') {
				jQuery('#player-add-name').val('');
				View.toggleSlide('#player-add', false);
			}
		});
	},

	changePointsManually(playerID, shouldAdd) {
		const player = DB.fetchPlayer(playerID);
		DB.addPoints(player, shouldAdd ? 1 : -1);
		View.updatePointsModal(false);
		View.animateReorder();
	},

	playerAdd() {
		const name = jQuery('#player-add-name').val();
		if (name == '') {
			return;
		}
		const player = DB.fetchPlayerByName(name);
		if (player) {
			showToast(I18n.t('toast.duplicateName'), 'error');
			return;
		}
		DB.createPlayer(name);
		View.fillDataNodes('players');
		jQuery('#player-add-name').val('');
	},

	playerRemove() {
		const selected = jQuery('#players option:selected');
		if (selected.length) {
			if (confirm(I18n.t('confirm.removePlayer'))) {
				selected.each((index, playerElement) => {
					DB.removePlayer(jQuery(playerElement).data('playerId'));
				});
				View.fillDataNodes('players');
			}
		} else {
			showToast(I18n.t('toast.noPlayerSelected'), 'warning');
		}
	},

	playersPurge() {
		if (DB.fetchAllPlayers().length > 0 && confirm(I18n.t('confirm.purgeAllPlayers'))) {
			DB.removeAllPlayers();
			View.fillDataNodes('players');
			showToast(I18n.t('toast.purged'));
		}
	},
};

const init = () => {
	View.fillDataNodes('questions');
	// TODO: Check these, are they needed?
	jQuery('button.btn-close[data-slide="up"]').on('click', function () {
		View.toggleSlide(jQuery(this).parent()[0], false);
	});
	jQuery('button.btn-close[data-slide="up-modal"]').on('click', function () {
		View.toggleSlide(jQuery(this).parent()[0], false);
		View.lightSwitch();
	});
	jQuery('#player-add-form').on('submit', (event) => {
		event.preventDefault();
		App.playerAdd();
	});
	App.bindKeypress();
	View.setupSettings();
	View.fillDataNodes('players');
	import('./game.js').then(({ Game }) => Game.checkQuizProgress());
};

jQuery(() => {
	initI18n().then(() => {
		View.loadLogo();
		jQuery('#version-info').text('v' + DB.version);
		loadQuizManifest().then(() => {
			loadQuestions();
			if (Loader.scriptsToLoad === 0) {
				finishQuizLoading();
			}
		});
	});
});
