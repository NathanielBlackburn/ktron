const Page = {

	currentSettingsPage: 1,

	go: function (number = 0, noHide = false) {
		$('.carousel').carousel(number);
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

const toggleSlide = (element, noClose, speed) => {
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

const fillDataNodes = (node) => {
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
			const list = $('#quiz-list');
			$(list).empty();
			KTron.quizzes.forEach(quiz => {
				const option = document.createElement('option');
				option.appendChild(document.createTextNode(quiz.title));
				$(option).data('quizCode', quiz.code);
				list.append(option);
			});
			updateQuestionsDescription(KTron.quizzes[0]);
			$(list).off('change');
			$(list).on('change', (event) => {
				const code = $(event.target).find(':selected').first().data('quizCode');
				updateQuestionsDescription(KTron.quizzes.find(quiz => (quiz.code == code)));
			});
			break;
		}
	}

};

const updateQuestionsDescription = (quiz) => {
	$('#question-set-title').html('<strong>' + I18n.t('quiz.titleLabel') + ' </strong>  <span class="content">' + quiz.title + '</span>');
	$('#question-set-author').html('<strong>' + I18n.t('quiz.authorLabel') + ' </strong>  <span class="content">' + quiz.author + '</span>');
	$('#question-set-count').html('<strong>' + I18n.t('quiz.questionsCountLabel') + ' </strong>  <span class="content">' + quiz.questions.length + '</span>');
};

const error = (msg, title) => {
	if (typeof title === 'undefined') {
		title = I18n.t('modal.error.title');
	}
	$('#error-modal-title').empty().html(title);
	$('#error-modal-content').empty().html(msg);
	const myModal = new bootstrap.Modal('#error-message');
	myModal.toggle();
};

const formatOvertimePoints = (points) => {
	return (points > 0) ? `(+${points})` : '';
};

const createPointsModal = () => {
	const players = DB.fetchAllPlayers();
	const tbody = $('#points-modal-tbody');
	$(tbody).empty();
	players.forEach((player) => {
		const removeButton = Quiz.inProgress && !player.removed
			? `<button type="button" class="btn btn-tiny btn-outline-secondary ms-1" data-role="remove-player" onclick="removePlayerFromGame(${player.ID})" aria-label="${I18n.t('player.removeAria')}">×</button>`
			: '';
		let currentStats = tbody.html();
		currentStats += `<tr data-player-id="${player.ID}"><td data-role="lp"></td><td data-role="name-cell"><span data-role="player-name">${player.name}</span>${removeButton}</td><td><button class="btn btn-tiny btn-danger inline" data-role="points-change" onclick="changePointsManually(${player.ID}, false)">-</button><span style="display: inline-block; width: 50px; text-align: center;"><span data-role="points"></span> <span data-role="overtime" style="font-size: small"></span></span><button class="btn btn-tiny btn-primary inline" data-role="points-change" onclick="changePointsManually(${player.ID}, true)">+</button></td></tr>`;
		tbody.html(currentStats);
	});
};

const hidePointsModal = () => {
	if ($('#points-modal').hasClass('show')) {
		const modal = bootstrap.Modal.getInstance('#points-modal');
		if (modal) {
			modal.hide();
		}
	}
};

const togglePointsModal = () => {
	if ($('#points-modal').hasClass('show')) {
		hidePointsModal();
	} else {
		showPointsModal();
	}
};

const showPointsModal = () => {
	updatePointsModal();
	if (!DB.canChangePoints) {
		$('button[data-role="points-change"]').hide();
	}
	if (Quiz.inProgress) {
		$('#points-modal button[data-role="remove-player"]').show();
	} else {
		$('#points-modal button[data-role="remove-player"]').hide();
	}
	const myModal = new bootstrap.Modal('#points-modal');
	myModal.toggle();
};

const updatePointsModal = (sort = true) => {
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

const changePointsManually = (playerID, shouldAdd) => {
	const player = DB.fetchPlayer(playerID);
	DB.addPoints(player, shouldAdd ? 1 : -1);
	updatePointsModal(false);
	animateReorder();
};

const playerAdd = () => {
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

const playerRemove = () => {
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

const playersPurge = () => {
	if (DB.fetchAllPlayers().length > 0 && confirm(I18n.t('confirm.purgeAllPlayers'))) {
		DB.removeAllPlayers();
		fillDataNodes('players');
		showToast(I18n.t('toast.purged'));
	}
};

const playerAddShow = () => {
	toggleSlide('#player-add');
	$('#player-add-name').trigger('focus');

};

const lightSwitch = () => {
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

const loadScript = (code) => {
	const script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = `pytania/${code}/${code}.js`;
	$(script).on('load', function () {
		KTron.scriptsLoaded += 1;
		if (KTron.scriptsLoaded == KTron.scriptsToLoad) {
			i18nReady.then(() => init());
		}
	});
	document.head.appendChild(script);
};

const loadQuestions = () => {
	if (KTron.config && KTron.config.quizFiles) {
		const config = KTron.config;
		KTron.scriptsToLoad = config.quizFiles.length;
		while (config.quizFiles.length) {
			const script = config.quizFiles.pop();
			loadScript(script);
		}
	}
};

const bindKeypress = () => {
	$(document).on('keyup', (event) => {
		if (event.shiftKey && event.code == 'KeyP' && Quiz.inProgress) {
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

const setupSettings = () => {
	document.querySelector('#settingsHalfPoint').checked = Quiz.settings.buttonHalf;
	document.querySelector('#settingsOnePoint').checked = Quiz.settings.buttonOne;
	document.querySelector('#settingsOneHalfPoint').checked = Quiz.settings.buttonOneHalf;
	document.querySelector('#settingsTwoPoints').checked = Quiz.settings.buttonTwo;
	document.querySelector('#settingsShowPointsAfterEachRound').checked = Quiz.settings.showPointsAfterEachRound;
	document.querySelector('#settingsUseCustomVictoryImage').checked = Quiz.settings.useCustomVictoryImage;
	document.querySelector('#settingsUseCustomVictoryFanfare').checked = Quiz.settings.useCustomVictoryFanfare;
	document.querySelector('#settingsShowQuestionAudioOnAnswer').checked = Quiz.settings.showQuestionAudioOnAnswer;
};

const settingsToggle = (target) => {
	switch (target.id) {
		case 'settingsHalfPoint':
			Quiz.settings.buttonHalf = target.checked;
			break;
		case 'settingsOnePoint':
			Quiz.settings.buttonOne = target.checked;
			break;
		case 'settingsOneHalfPoint':
			Quiz.settings.buttonOneHalf = target.checked;
			break;
		case 'settingsTwoPoints':
			Quiz.settings.buttonTwo = target.checked;
			break;
		case 'settingsShowPointsAfterEachRound':
			Quiz.settings.showPointsAfterEachRound = target.checked;
			break;
		case 'settingsUseCustomVictoryImage':
			Quiz.settings.useCustomVictoryImage = target.checked;
			break;
		case 'settingsUseCustomVictoryFanfare':
			Quiz.settings.useCustomVictoryFanfare = target.checked;
			break;
		case 'settingsShowQuestionAudioOnAnswer':
			Quiz.settings.showQuestionAudioOnAnswer = target.checked;
			break;
	}
};

const changeLogo = (target) => {
	Quiz.settings.logo = target.value;
	loadLogo();
};

const loadLogo = () => {
	const logo = Quiz.settings.logo;
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

const init = () => {
	fillDataNodes('questions');
	$('.carousel').carousel({
		interval: false
	});
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
	checkQuizProgress();
};

const pointsToWords = (number) => {
	number = parseFloat(number);
	if (I18n.locale === 'en') {
		return (number === 1) ? I18n.t('points.word_one') : I18n.t('points.word_many');
	}
	if (Math.floor(number) != number) {
		return I18n.t('points.word_fraction');
	} else if (number == 1) {
		return I18n.t('points.word_one');
	} else {
		number = number.toString().slice(-1);
		if (number >= 2 && number <= 4) {
			return I18n.t('points.word_few');
		} else {
			return I18n.t('points.word_many');
		}
	}
};

const isVisible = (el) => {
	return !el.hasClass('d-none');
};

const isDisabled = (element) => {
	return $(element).hasClass('disabled');
}

const showToast = (text, type = 'info') => {
	const toast = $('#quiz-toast').get(0);
	$('#quiz-toast div.toast-body').text(text);
	$('#quiz-toast div.toast-icon').removeClass(['toast-icon-info', 'toast-icon-warning', 'toast-icon-error']);
	switch (type) {
		case 'warning':
			$('#quiz-toast div.toast-icon').addClass('toast-icon-warning');
			$('#quiz-toast strong.toast-title').text(I18n.t('toast.warning'));
			break;
		case 'error':
			$('#quiz-toast div.toast-icon').addClass('toast-icon-error');
			$('#quiz-toast strong.toast-title').text(I18n.t('toast.error'));
			break;
		default:
			$('#quiz-toast div.toast-icon').addClass('toast-icon-info');
			$('#quiz-toast strong.toast-title').text(I18n.t('toast.info'));
	}
	const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
	toastBootstrap.show();
};

const showEl = (selector) => {
	const element = (selector.constructor == $().constructor) ? selector : $(selector);
	element.removeClass('d-none');
};

const hideEl = (selector) => {
	const element = (selector.constructor == $().constructor) ? selector : $(selector);
	element.addClass('d-none');
};

const animateReorder = () => {
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

const reorderWithNoAnimation = () => {
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
	i18nReady = I18n.init();
	i18nReady.then(() => {
		if (KTron && KTron.quizzes) {
			window['questions'] = KTron.quizzes;
		}
		loadLogo();
		loadQuestions();
		$('#version-info').text('v' + DB.version);
		if (KTron.scriptsToLoad === 0) {
			init();
		}
	});
});
