var Page = {

	currentSettingsPage: 1,

	go: function(number, noHide) {
		if (typeof number == 'undefined')
			number = 0;
		if (typeof noHide == 'undefined')
			noHide = false;
		$('.carousel').carousel(number);
		if (number != 0)
			this.currentSettingsPage = number;
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

var toggleSlide = function(element, noClose, speed) {

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

var fillDataNodes = function(node, clear) {

	if (typeof clear == 'undefined')
		clear = false;
	switch (node) {
		case 'players':
			var players = db.query('players');
			var list = $('#all-players')[0];
			if (clear)
				$(list).empty();
			players.sort(function(a, b) {
				if (a.name < b.name)
					return -1;
				else if (a.name == b.name)
					return 0;
				else if (a.name > b.name)
					return 1;
			});
			var players_chosen = db.query('players_chosen');
			var chosen_IDs = [];
			for (var i = 0; i < players_chosen.length; i++)
				chosen_IDs.push(parseInt(players_chosen[i].id_player));
			for (var i = 0; i < players.length; i++) {
				if (chosen_IDs.indexOf(players[i].ID) == -1) {
					var option = document.createElement('option');
					option.setAttribute('value', players[i].ID);
					option.appendChild(document.createTextNode(players[i].name));
					$(option).dblclick(function() {
						playerMoveToLeft(this);
					});
					list.appendChild(option);
				}
			}
			break;
		case 'players_chosen':
			var players_chosen = db.query('players_chosen');
			var players = db.query('players');
			var list = $('#players-chosen')[0];
			if (clear)
				$(list).empty();
			players.sort(function(a, b) {
				if (a.name < b.name)
					return -1;
				else if (a.name == b.name)
					return 0;
				else if (a.name > b.name)
					return 1;
			});
			var chosen_IDs = [];
			for (var i = 0; i < players_chosen.length; i++)
				chosen_IDs.push(parseInt(players_chosen[i].id_player));
			var players = db.query('players');
			for (var i = 0; i < players.length; i++) {
				if (chosen_IDs.indexOf(players[i].ID) != -1) {
					var option = document.createElement('option');
					option.setAttribute('value', players[i].ID);
					option.appendChild(document.createTextNode(players[i].name));
					$(option).dblclick(function() {
						playerMoveToRight(this);
					});
					list.appendChild(option);
				}
			}
			break;
		case 'questions':
			var list = $('#questions-list')[0];
			if (clear)
				$(list).empty();
			if (questions.length) {
				for (var i = 0; i < questions.length; i++) {
					var option = document.createElement('option');
					option.setAttribute('value', i);
					option.appendChild(document.createTextNode(questions[i].title));
					list.appendChild(option);
				}
				updateQuestionsDescription(0);
				$(list).unbind('change');
				$(list).change(function() {
					updateQuestionsDescription($(this).find(':selected')[0].getAttribute('value'));
				});
			}
			break;
	}

};

var updateQuestionsDescription = function(number) {

	rows = db.query('players', {name: questions[number].author});
	var author = questions[number].author;
	// if (!rows.length) {
	// 	author = '<a id="author-error" class="error-tooltip" href="#" data-toggle="tooltip">' + author + '</a>';
	// }
	$('#question-set-title').html('<strong>Tytuł: </strong>  <span class="content">' + questions[number].title + '</span>');
	$('#question-set-author').html('<strong>Autor: </strong>  <span class="content">' + author + '</span>');
	$('#question-set-count').html('<strong>Ilość pytań: </strong>  <span class="content">' + questions[number].questions.length + '</span>');
	// if (!rows.length)
	// 	$('#author-error').tooltip({html: true, title: 'Błąd! Nie ma takiego<br />użytkownika w bazie.'});

};

var error = function(msg, modal) {

	if (typeof modal == 'undefined')
		modal = false;
	if (!modal)
		alert(msg);
	else {
		$('#error-message p#message').empty().text(msg);
		$('#error-message').modal();
	}

};

var playerAdd = function() {

	var name = $('#player-add-name').val();
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
			updateQuestionsDescription($('#questions-choice').find(':selected')[0].getAttribute('value'));
			$('#player-add-name').val('');
			toggleSlide('#player-add', false);
		}
	}	

};

var playerRemove = function() {

	var selected = $('#all-players option:selected');
	if (selected.length)
		if (confirm('Na pewno usunąć?')) {
			for (var i = 0; i < selected.length; i++) {
				db.deleteRows('players', {ID: selected[i].getAttribute('value')});
				db.commit();
			}
			fillDataNodes('players', true);
			updateQuestionsDescription($('#questions-choice').find(':selected')[0].getAttribute('value'));
		}

};

var playerMoveToLeft = function(player) {

	db.insert('players_chosen', {id_player: player.getAttribute('value')});
	db.commit();
	fillDataNodes('players', true);
	fillDataNodes('players_chosen', true);

};

var playerMoveToRight = function(player) {

	db.deleteRows('players_chosen', {id_player: player.getAttribute('value')});
	db.commit();
	fillDataNodes('players', true);
	fillDataNodes('players_chosen', true);

};

var allPlayersToLeft = function() {

	$('#all-players option').each(function() {
		playerMoveToLeft(this);
	});

};

var allPlayersToRight = function() {
	
	$('#players-chosen option').each(function() {
		playerMoveToRight(this);
	});

};

var playerAddShow = function() {

	toggleSlide('#player-add');
	$('#player-add-name').focus();

};

var lightSwitch = function(fade) {

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

var loadScript = function(src, last) {

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

var loadQuestions = function() {

	if (config && config.questionFiles) {
		while (config.questionFiles.length) {
			var script = config.questionFiles.pop();
			loadScript(script, config.questionFiles.length == 0);
		}
	}

};

var bindKeypress = function() {

	$(document).keypress(function(event) {
		if (event.which == 80 && event.shiftKey && typeof quiz.gameId != 'undefined') {
			Stats.gamePointsModal();
		}
	});

};

var init = function() {

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

var pointsToWords = function(number) {

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

var inObject = function(obj, prop, val) {

	var found = false;
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (key == prop && obj[key] == val)
				found = true;
			else if (obj[key] instanceof Array) {
				for (var i = 0; i < obj[key].length; i++) {
					if (obj[key][i] instanceof Object)
						found = found || inObject(obj[key][i], prop, val);
				}
			}
		}
	}
	return found;

};

function isDisabled(element) {
	return $(element).hasClass('disabled');
}

$(function() {

	loadQuestions();

});
