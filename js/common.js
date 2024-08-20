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
	$('#question-set-title').html('<strong>Tytuł: </strong>  <span class="content">' + quiz.title + '</span>');
	$('#question-set-author').html('<strong>Autor: </strong>  <span class="content">' + quiz.author + '</span>');
	$('#question-set-count').html('<strong>Liczba pytań: </strong>  <span class="content">' + quiz.questions.length + '</span>');
};

const error = (msg, title = 'Błąd!') => {
	$('#error-modal-title').empty().html(title);
	$('#error-modal-content').empty().html(msg);
	const myModal = new bootstrap.Modal('#error-message');
	myModal.toggle();
};

const formatOvertimePoints = (points) => {
	return (points > 0) ? `(+${points})` : '';
};

const togglePointsModal = () => {
	if ($('#points-modal').hasClass('show')) {
		const modal = bootstrap.Modal.getInstance('#points-modal');
		modal.hide();
	} else {
		showPointsModal();
	}
};

const showPointsModal = () => {
	const players = DB.fetchAllPlayers();
	const points = DB.fetchAllPoints();
	if (!points.length) {
		showToast('Nie zdobyto jeszcze żadnych punktów.', 'warning');
		return;
	}
	players.forEach((player) => {
		player['points'] = DB.fetchPlayerPoints(player.ID, false);
		player['overtimePoints'] = DB.fetchPlayerPoints(player.ID, true);
	});
	players.sort((a, b) => {
		if (a.points < b.points) {
			return 1;
		} else if (a.points == b.points) {
			if (a.overtimePoints < b.overtimePoints)
				return 1;
			else if (a.overtimePoints == b.overtimePoints)
				return 0;
			else if (a.overtimePoints > b.overtimePoints)
				return -1;
		} else if (a.points > b.points) {
			return -1;
		}
	});
	let lp = 1;
	const tbody = $('#points-modal table tbody');
	tbody.empty();
	players.forEach((player) => {
		let currentStats = tbody.html();
		const points = player.points;
		const overtimePoints = formatOvertimePoints(player.overtimePoints);
		currentStats += `<tr><td>${lp}</td><td>${player.name}</td><td>${points} <span style="font-size: small;">${overtimePoints}</span></td></tr>`;
		tbody.html(currentStats);
	});
	const myModal = new bootstrap.Modal('#points-modal');
	myModal.toggle();
};

const playerAdd = () => {
	const name = $('#player-add-name').val();
	if (name == '') {
		return;
	} else {
		const player = DB.fetchPlayerByName(name);
		if (player) {
			showToast('Taka nazwa już istnieje.', 'error');
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
		if (confirm('Na pewno usunąć?')) {
			selected.each((index, playerElement) => {
				DB.removePlayer($(playerElement).data('playerId'));
			});
			fillDataNodes('players');
		}
	} else {
		showToast('Nie wybrano nikogo do usunięcia.', 'warning');
	}
};

const playersPurge = () => {
	if (DB.fetchAllPlayers().length > 0 && confirm('Na pewno usunąć WSZYSTKICH graczy?')) {
		DB.removeAllPlayers();
		fillDataNodes('players');
		showToast('Usunięto.');
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
			init();
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
		} else if (event.shiftKey && event.altKey && event.code == 'KeyR') {
			if (confirm('Ar ju siur?')) {
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
	}
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
	if (Math.floor(number) != number) {
		return 'punkta';
	} else if (number == 1) {
		return 'punkt';
	} else {
		number = number.toString().slice(-1);
		if (number >= 2 && number <= 4) {
			return 'punkty';
		} else {
			return 'punktów';
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
			$('#quiz-toast strong.toast-title').text('Uwaga');
			break;
		case 'error':
			$('#quiz-toast div.toast-icon').addClass('toast-icon-error');
			$('#quiz-toast strong.toast-title').text('Błąd!');
			break;
		default:
			$('#quiz-toast div.toast-icon').addClass('toast-icon-info');
			$('#quiz-toast strong.toast-title').text('Info');
	}
	const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
	toastBootstrap.show()
};

const showEl = (selector) => {
	const element = (selector.constructor == $().constructor) ? selector : $(selector);
	element.removeClass('d-none');
};

const hideEl = (selector) => {
	const element = (selector.constructor == $().constructor) ? selector : $(selector);
	element.addClass('d-none');
};

$(() => {
	if (KTron && KTron.quizzes) {
		window['questions'] = KTron.quizzes;
	}
	loadQuestions();
});
