import './setupGlobals.js';
import { bootstrap } from './setupGlobals.js';
import { KTron, UI } from './config.js';
import { DB } from './db.js';
import { settings } from './model/settings.js';
import { GameSession } from './model/gameSession.js';
import { I18n, i18nReady, initI18n } from './i18n.js';
import { error, formatOvertimePoints, showToast } from './helpers.js';

const getMainCarousel = () => {
	const el = document.getElementById('main');
	if (!el) {
		return null;
	}
	return bootstrap.Carousel.getOrCreateInstance(el, { interval: false });
};

export const Page = {

	currentSettingsPage: 1,

	go: function (number = 0, noHide = false) {
		getMainCarousel()?.to(number);
		if (number != 0) {
			this.currentSettingsPage = number;
		}
		if (!noHide) {
			if ($('#navbar').data('visible')) {
				$('#navbar').slideUp(500);
				$('#navbar').data('visible', false);
			} else {
				$('#navbar').slideDown(500);
				$('#navbar').data('visible', true);
			}
		}
	},

	start: function () {
		this.go();
	},

	menuButton: function (button) {
		if (!$(button).hasClass('active')) {
			$('.navbar button.page').each(function () {
				$(this).removeClass('active');
			});
			this.go($(button).data('page'), true);
			$(button).addClass('active');
		}

	}
};

export const toggleSlide = (element, noClose, speed) => {
	if (typeof speed == 'undefined')
		speed = 300;
	if (typeof noClose == 'undefined')
		noClose = true;
	if ($(element).is(':hidden')) {
		$(element).slideDown(speed);
	} else if (!noClose) {
		$(element).slideUp(speed);
	}
};

const getStoredQuizCode = () => {
	try {
		const storage = JSON.parse(window.localStorage.ktron_settings || '{}');
		return storage.selectedQuizCode;
	} catch {
		return undefined;
	}
};

const setStoredQuizCode = (code) => {
	try {
		const storage = JSON.parse(window.localStorage.ktron_settings || '{}');
		storage.selectedQuizCode = code;
		window.localStorage.ktron_settings = JSON.stringify(storage);
	} catch {
		// ignore
	}
};

const resolveSelectedQuiz = (quizzes) => {
	const stored = getStoredQuizCode();
	if (stored) {
		const found = quizzes.find((quiz) => quiz.code == stored);
		if (found) {
			return found;
		}
	}
	return quizzes[0];
};

export const fillDataNodes = (node) => {
	switch (node) {
		case 'players': {
			const list = $('#players');
			$(list).empty();
			const players = DB.fetchAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
			players
				.forEach(player => {
					const option = document.createElement('option');
					option.appendChild(document.createTextNode(player.name));
					$(option).data('playerId', player.ID);
					list.append(option);
				});
			break;
		}
		case 'questions': {
			if (!KTron.quizzes.length) {
				return;
			}
			const selectedQuiz = resolveSelectedQuiz(KTron.quizzes);
			const list = $('#quiz-list');
			$(list).empty();
			KTron.quizzes.forEach(quiz => {
				const option = document.createElement('option');
				option.appendChild(document.createTextNode(quiz.title));
				$(option).data('quizCode', quiz.code);
				if (quiz.code == selectedQuiz.code) {
					option.selected = true;
				}
				list.append(option);
			});
			updateQuestionsDescription(selectedQuiz);
			$(list).off('change');
			$(list).on('change', (event) => {
				const code = $(event.target).find(':selected').first().data('quizCode');
				setStoredQuizCode(code);
				updateQuestionsDescription(KTron.quizzes.find(quiz => (quiz.code == code)));
			});
			break;
		}
	}

};

export const updateQuestionsDescription = (quiz) => {
	$('#question-set-title').html('<strong>' + I18n.t('quiz.titleLabel') + ' </strong>  <span class="content">' + quiz.title + '</span>');
	$('#question-set-author').html('<strong>' + I18n.t('quiz.authorLabel') + ' </strong>  <span class="content">' + quiz.author + '</span>');
	$('#question-set-count').html('<strong>' + I18n.t('quiz.questionsCountLabel') + ' </strong>  <span class="content">' + quiz.questions.length + '</span>');
};

export const createPointsModal = () => {
	const players = DB.fetchAllPlayers();
	const tbody = $('#points-modal-tbody');
	$(tbody).empty();
	players.forEach((player) => {
		const removeButton = GameSession.inProgress && !player.removed
			? `<button type="button" class="btn btn-tiny btn-outline-secondary ms-1" data-role="remove-player" onclick="removePlayerFromGame(${player.ID})" aria-label="${I18n.t('player.removeAria')}">×</button>`
			: '';
		let currentStats = tbody.html();
		currentStats += `<tr data-player-id="${player.ID}"><td data-role="lp"></td><td data-role="name-cell"><span data-role="player-name">${player.name}</span>${removeButton}</td><td><button class="btn btn-tiny btn-danger inline" data-role="points-change" onclick="changePointsManually(${player.ID}, false)">-</button><span style="display: inline-block; width: 50px; text-align: center;"><span data-role="points"></span> <span data-role="overtime" style="font-size: small"></span></span><button class="btn btn-tiny btn-primary inline" data-role="points-change" onclick="changePointsManually(${player.ID}, true)">+</button></td></tr>`;
		tbody.html(currentStats);
	});
};

export const hidePointsModal = () => {
	if ($('#points-modal').hasClass('show')) {
		const modal = bootstrap.Modal.getInstance('#points-modal');
		if (modal) {
			modal.hide();
		}
	}
};

export const togglePointsModal = () => {
	if ($('#points-modal').hasClass('show')) {
		hidePointsModal();
	} else {
		showPointsModal();
	}
};

export const showPointsModal = () => {
	updatePointsModal();
	if (!DB.canChangePoints) {
		$('button[data-role="points-change"]').hide();
	}
	if (GameSession.inProgress) {
		$('#points-modal button[data-role="remove-player"]').show();
	} else {
		$('#points-modal button[data-role="remove-player"]').hide();
	}
	const myModal = new bootstrap.Modal('#points-modal');
	myModal.toggle();
};

export const updatePointsModal = (sort = true) => {
	const players = DB.fetchAllPlayers();
	players.forEach((player) => {
		player['points'] = player.removed ? 0 : DB.fetchPlayerPoints(player.ID, false);
		player['overtimePoints'] = player.removed ? 0 : DB.fetchPlayerPoints(player.ID, true);
	});
	const tbody = document.querySelector('#points-modal-tbody');
	players.forEach((player) => {
		const row = tbody.querySelector(`tr[data-player-id="${player.ID}"]`);
		row.classList.toggle('player-removed', !!player.removed);
		const pointsSpan = row.querySelector('span[data-role="points"]');
		pointsSpan.textContent = player.removed ? 0 : player.points;
		const overtimeSpan = row.querySelector('span[data-role="overtime"]');
		overtimeSpan.textContent = player.removed ? '' : formatOvertimePoints(player.overtimePoints);
		row.querySelectorAll('[data-role="remove-player"], [data-role="points-change"]').forEach((el) => {
			el.style.display = player.removed ? 'none' : '';
		});
	});
	if (sort) {
		reorderWithNoAnimation();
	}
};

export const changePointsManually = (playerID, shouldAdd) => {
	const player = DB.fetchPlayer(playerID);
	DB.addPoints(player, shouldAdd ? 1 : -1);
	updatePointsModal(false);
	animateReorder();
};

export const playerAdd = () => {
	const name = $('#player-add-name').val();
	if (name == '') {
		return;
	} else {
		const player = DB.fetchPlayerByName(name);
		if (player) {
			showToast(I18n.t('toast.duplicateName'), 'error');
			return;
		} else {
			DB.createPlayer(name);
			fillDataNodes('players');
			$('#player-add-name').val('');
		}
	}
};

export const playerRemove = () => {
	const selected = $('#players option:selected');
	if (selected.length) {
		if (confirm(I18n.t('confirm.removePlayer'))) {
			selected.each((index, playerElement) => {
				DB.removePlayer($(playerElement).data('playerId'));
			});
			fillDataNodes('players');
		}
	} else {
		showToast(I18n.t('toast.noPlayerSelected'), 'warning');
	}
};

export const playersPurge = () => {
	if (DB.fetchAllPlayers().length > 0 && confirm(I18n.t('confirm.purgeAllPlayers'))) {
		DB.removeAllPlayers();
		fillDataNodes('players');
		showToast(I18n.t('toast.purged'));
	}
};

export const playerAddShow = () => {
	toggleSlide('#player-add');
	$('#player-add-name').trigger('focus');

};

export const lightSwitch = () => {
	if ($('#cinema-fade').is(':hidden')) {
		$('#cinema-fade').fadeIn(300);
		$('#cinema-light i').removeClass('bi-lightbulb-fill').addClass('bi-lightbulb-off-fill');
		$('#cinema-light').removeClass('btn-dark').addClass('btn-light');
	} else {
		$('#cinema-fade').fadeOut(300);
		$('#cinema-light i').removeClass('bi-lightbulb-off-fill').addClass('bi-lightbulb-fill');
		$('#cinema-light').removeClass('btn-light').addClass('btn-dark');
	}
};

const finishQuizLoading = () => {
	KTron.quizzesReady = true;
	i18nReady.then(() => init());
};

const loadScript = (code) => {
	const script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = `pytania/${code}/${code}.js`;
	$(script).on('load', function () {
		KTron.scriptsLoaded += 1;
		if (KTron.scriptsLoaded == KTron.scriptsToLoad) {
			finishQuizLoading();
		}
	});
	document.head.appendChild(script);
};

const loadQuestions = () => {
	const codes = KTron.config?.quizFiles;
	if (!codes?.length) {
		return;
	}
	KTron.scriptsToLoad = codes.length;
	KTron.scriptsLoaded = 0;
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
				KTron.config.quizFiles = [...window.ktronQuizFiles];
			}
			delete window.ktronQuizFiles;
			resolve();
		};
		script.onerror = () => {
			KTron.config.quizFiles = [];
			resolve();
		};
		document.head.appendChild(script);
	});
};

const loadQuizManifest = () => {
	return fetch(QUIZ_MANIFEST_URL)
		.then((response) => (response.ok ? response.text() : Promise.reject()))
		.then((text) => {
			KTron.config.quizFiles = parseQuizManifestText(text);
		})
		.catch(() => loadQuizManifestViaScript());
};

export const bindKeypress = () => {
	$(document).on('keyup', (event) => {
		if (event.shiftKey && event.code == 'KeyP' && GameSession.inProgress) {
			togglePointsModal();
		} else if (event.shiftKey && event.altKey && event.code == 'KeyQ') {
			if (confirm(I18n.t('confirm.easterEgg'))) {
				DB.purge();
			}
		}
	});
	$('#player-add-name').on('keyup', (event) => {
		if (event.code == 'Escape') {
			$('#player-add-name').val('');
			toggleSlide('#player-add', false);
		}
	});
};

export const setupSettings = () => {
	document.querySelector('#settingsHalfPoint').checked = settings.buttonHalf;
	document.querySelector('#settingsOnePoint').checked = settings.buttonOne;
	document.querySelector('#settingsOneHalfPoint').checked = settings.buttonOneHalf;
	document.querySelector('#settingsTwoPoints').checked = settings.buttonTwo;
	document.querySelector('#settingsShowPointsAfterEachRound').checked = settings.showPointsAfterEachRound;
	document.querySelector('#settingsUseCustomVictoryImage').checked = settings.useCustomVictoryImage;
	document.querySelector('#settingsUseCustomVictoryFanfare').checked = settings.useCustomVictoryFanfare;
	document.querySelector('#settingsShowQuestionAudioOnAnswer').checked = settings.showQuestionAudioOnAnswer;
};

export const settingsToggle = (target) => {
	switch (target.id) {
		case 'settingsHalfPoint':
			settings.buttonHalf = target.checked;
			break;
		case 'settingsOnePoint':
			settings.buttonOne = target.checked;
			break;
		case 'settingsOneHalfPoint':
			settings.buttonOneHalf = target.checked;
			break;
		case 'settingsTwoPoints':
			settings.buttonTwo = target.checked;
			break;
		case 'settingsShowPointsAfterEachRound':
			settings.showPointsAfterEachRound = target.checked;
			break;
		case 'settingsUseCustomVictoryImage':
			settings.useCustomVictoryImage = target.checked;
			break;
		case 'settingsUseCustomVictoryFanfare':
			settings.useCustomVictoryFanfare = target.checked;
			break;
		case 'settingsShowQuestionAudioOnAnswer':
			settings.showQuestionAudioOnAnswer = target.checked;
			break;
	}
};

export const changeLogo = (target) => {
	settings.logo = target.value;
	loadLogo();
};

export const loadLogo = () => {
	const logo = settings.logo ?? UI.defaults.LOGO_IMAGE;
	const path = (logo == 'custom') ? `res/custom/logo.png` : `res/logo/${logo}.png`;
	const logoImg = document.getElementById('logo-image');
	logoImg.src = path;
	document.getElementById('logo-list').value = logo;
	logoImg.onerror = () => {
		showToast(I18n.t('toast.logoNotFound'), 'error');
		logoImg.onerror = null;
		logoImg.src = `res/logo/${UI.defaults.LOGO_IMAGE}.png`;
		document.getElementById('logo-list').value = UI.defaults.LOGO_IMAGE;
	};
	logoImg.onload = () => {
		logoImg.onload = null;
		logoImg.onerror = null;
	};
};

export const init = () => {
	fillDataNodes('questions');
	getMainCarousel();
	// TODO: Check these, are they needed?
	$('button.btn-close[data-slide="up"]').on('click', function () {
		toggleSlide($(this).parent()[0], false);
	});
	$('button.btn-close[data-slide="up-modal"]').on('click', function () {
		toggleSlide($(this).parent()[0], false);
		lightSwitch('#cinema-fade-modal');
	});
	$('#player-add-form').on('submit', (event) => {
		event.preventDefault();
		playerAdd();
	});
	bindKeypress();
	setupSettings();
	fillDataNodes('players');
	import('./quiz.js').then(({ checkQuizProgress }) => checkQuizProgress());
};

export const isVisible = (el) => {
	return !el.hasClass('d-none');
};

export const isDisabled = (element) => {
	return $(element).hasClass('disabled');
}

export const showEl = (selector) => {
	const element = (selector.constructor == $().constructor) ? selector : $(selector);
	element.removeClass('d-none');
};

export const hideEl = (selector) => {
	const element = (selector.constructor == $().constructor) ? selector : $(selector);
	element.addClass('d-none');
};

export const animateReorder = () => {
	const tbody = document.getElementById('points-modal-tbody');
  	const first = new Map();
  	[...tbody.children].forEach(el => {
    	first.set(el, el.getBoundingClientRect());
  	});

  	const rows = [...tbody.children].sort((a, b) => {
		const pointsA = +a.querySelector('span[data-role="points"]').textContent;
		const pointsB = +b.querySelector('span[data-role="points"]').textContent;
		const overtimeA = +a.querySelector('span[data-role="overtime"]').textContent.replace(/[+()]/g, '');
		const overtimeB = +b.querySelector('span[data-role="overtime"]').textContent.replace(/[+()]/g, '');
		if (pointsA == pointsB) {
			return overtimeB - overtimeA;
		} else {
			return pointsB - pointsA;
		}
	});
  	rows.forEach(r => tbody.appendChild(r));
	[...tbody.children].forEach((el, index) => {
		el.querySelector('td[data-role="lp"]').textContent = index + 1;
	});

  	[...tbody.children].forEach(el => {
    	const last = el.getBoundingClientRect();
    	const dx = first.get(el).left - last.left;
    	const dy = first.get(el).top - last.top;
    	gsap.fromTo(
			el,
			{ x: dx, y: dy },
			{
      			duration: 0.4,
      			x: 0,
      			y: 0,
      			ease: "power2.out"
    		}
		);
  	});
};

export const reorderWithNoAnimation = () => {
	const tbody = document.getElementById('points-modal-tbody');
  	const rows = [...tbody.children].sort((a, b) => {
		const pointsA = +a.querySelector('span[data-role="points"]').textContent;
		const pointsB = +b.querySelector('span[data-role="points"]').textContent;
		const overtimeA = +a.querySelector('span[data-role="overtime"]').textContent.replace(/[+()]/g, '');
		const overtimeB = +b.querySelector('span[data-role="overtime"]').textContent.replace(/[+()]/g, '');
		if (pointsA == pointsB) {
			return overtimeB - overtimeA;
		} else {
			return pointsB - pointsA;
		}
	});
  	rows.forEach(r => tbody.appendChild(r));
	[...tbody.children].forEach((el, index) => {
		el.querySelector('td[data-role="lp"]').textContent = index + 1;
	});
};

$(() => {
	initI18n().then(() => {
		if (KTron && KTron.quizzes) {
			window['questions'] = KTron.quizzes;
		}
		loadLogo();
		$('#version-info').text('v' + DB.version);
		loadQuizManifest().then(() => {
			loadQuestions();
			if (KTron.scriptsToLoad === 0) {
				finishQuizLoading();
			}
		});
	});
});
