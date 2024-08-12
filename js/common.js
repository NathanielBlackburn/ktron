const Page = {

	currentSettingsPage: 1,

	go: function(number = 0, noHide = false) {
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
	
	start: function() {
		this.go();
	},

	menuButton: function(button) {
		if (!$(button).hasClass('active')) {
			$('.navbar button.page').each(function() {
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

const fillDataNodes = (node, clear = false) => {
	const players = db.query('players').sort((a, b) => a.name.localeCompare(b.name));
	const chosenIDs = db.query('players_chosen').map((player) => parseInt(player.id_player));
	switch (node) {
		case 'players': {
			const list = $('#all-players');
			if (clear) {
				$(list).empty();
			}
			players
				.filter(player => !chosenIDs.includes(player.ID))
				.forEach(player => {
					const option = document.createElement('option');
					option.appendChild(document.createTextNode(player.name));
					$(option).data('quiz-player-id', player.ID);
					$(option).on('dblclick', (event) => {
						playerMoveToLeft($(event.target).data('quiz-player-id'));
					});
					list.append(option);
				});
			break;
		}
		case 'players_chosen': {
			const list = $('#players-chosen');
			if (clear) {
				$(list).empty();
			}
			players
				.filter(player => chosenIDs.includes(player.ID))
				.forEach(player => {
					const option = document.createElement('option');
					option.appendChild(document.createTextNode(player.name));
					$(option).data('quiz-player-id', player.ID);
					$(option).on('dblclick', (event) => {
						playerMoveToRight($(event.target).data('quiz-player-id'));
					});
					list.append(option);
				});
			break;
		}
		case 'questions': {
			if (!KTron.quizzes.length) {
				return;
			}
			const list = $('#quiz-list');
			if (clear) {
				$(list).empty();
			}
			KTron.quizzes.forEach(quiz => {
				const option = document.createElement('option');
				option.appendChild(document.createTextNode(quiz.title));
				$(option).data('quiz-code', quiz.code);
				list.append(option);
			});
			updateQuestionsDescription(KTron.quizzes[0]);
			$(list).off('change');
			$(list).on('change', (event) => {
				const code = $(event.target).find(':selected').first().data('quiz-code');
				updateQuestionsDescription(KTron.quizzes.find(quiz => (Quiz.code == code)));
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

const error = (msg, modal = false) => {

	if (!modal)
		alert(msg);
	else {
		$('#error-message-content').empty().text(msg);
		const myModal = new bootstrap.Modal('#error-message', {});
		myModal.toggle();
	}
};

const playerAdd = () => {

	const name = $('#player-add-name').val();
	if (name == '') {
		error('Podaj imię/nazwę drużyny!', true);
		return;
	} else {
		rows = db.query('players', {name: name});
		if (rows.length > 0) {
			error('Już jest taki wpis w bazie danych!', true);
			return;
		} else {
			db.insert('players', {name: name});
			db.commit();
			fillDataNodes('players', true);
			$('#player-add-name').val('');
		}
	}	

};

const playerRemove = () => {

	var selected = $('#all-players option:selected');
	if (selected.length) {
		if (confirm('Na pewno usunąć?')) {
			selected.forEach((player) => {
				db.deleteRows('players', {ID: player.getAttribute('value')});
				db.commit();
			});
			fillDataNodes('players', true);
			updateQuestionsDescription($('#questions-choice').find(':selected')[0].getAttribute('value'));
		}
	}
};

const playerMoveToLeft = (playerId) => {

	db.insert('players_chosen', {id_player: playerId});
	db.commit();
	fillDataNodes('players', true);
	fillDataNodes('players_chosen', true);

};

const playerMoveToRight = (playerId) => {
	db.deleteRows('players_chosen', {id_player: playerId});
	db.commit();
	fillDataNodes('players', true);
	fillDataNodes('players_chosen', true);
};

const allPlayersToLeft = () => {
	const players = db.query('players');
	players.forEach(player => {
		db.insert('players_chosen', {id_player: player.ID});
	});
	db.commit();
	fillDataNodes('players', true);
	fillDataNodes('players_chosen', true);
};

const allPlayersToRight = () => {
	db.truncate('players_chosen');
	db.commit();
	fillDataNodes('players', true);
	fillDataNodes('players_chosen', true);
};

const playerAddShow = () => {

	toggleSlide('#player-add');
	$('#player-add-name').focus();

};

const lightSwitch = (fade) => {

	if (typeof fade == 'undefined')
		fade = '#cinema-fade';
	if ($('#cinema-fade').is(':hidden')) {
		$('#cinema-fade').fadeIn(300);
		$('#cinema-light').css('transform', 'rotate(0)');
		$('#cinema-light').css('-moz-transform', 'rotate(0)');
		$('#cinema-light').css('-webkit-transform', 'rotate(0)');
	} else {
		$('#cinema-fade').fadeOut(300);
		$('#cinema-light').css('transform', 'rotate(180deg)');
		$('#cinema-light').css('-moz-transform', 'rotate(180deg)');
		$('#cinema-light').css('-webkit-transform', 'rotate(180deg)');
	}

};

const loadScript = (src, last) => {

	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = 'pytania/js/' + src;
	if (last) {
		$(script).on('load', function() {
			init();
		});
	}
	document.head.appendChild(script);

};

const loadQuestions = () => {

	if (KTron.config && KTron.config.quizFiles) {
		const config = KTron.config;
		while (config.quizFiles.length) {
			const script = config.quizFiles.pop();
			loadScript(script, config.quizFiles.length == 0);
		}
	}

};

const bindKeypress = () => {;

	$(document).on('keypress', (event) => {
		if (event.shiftKey && event.code == 'KeyP' && Quiz.inProgress) {
			Stats.gamePointsModal();
		} else if (event.shiftKey && event.altKey && event.code == 'KeyR') {
			if (confirm('Ar ju siur?')) {
				Admin.purge();
			}
		}
	});

};

const init = () => {

	fillDataNodes('questions', true);
	$('.carousel').carousel({
		interval: false
	});
	Stats.overallPlayersPoints();
	$('button.close[data-slide="up"]').click(function() {

		toggleSlide($(this).parent()[0], false);

	});
	$('button.close[data-slide="up-modal"]').click(function() {

		toggleSlide($(this).parent()[0], false);
		lightSwitch('#cinema-fade-modal');

	});
	bindKeypress();
	fillDataNodes('players');
	fillDataNodes('players_chosen');
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

const toggleVis = (el) => {
	if (!isVisible(el)) {
		el.removeClas('d-none');
		el.addClass('d-block');
	} else {
		el.removeClas('d-block');
		el.addClass('d-none');
	}
};

const isVisible = (el) => {
	return !el.hasClass('d-none');
};

const isDisabled = (element) => {
	return $(element).hasClass('disabled');
}

$(() => {
	loadQuestions();
});
