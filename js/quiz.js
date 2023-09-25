var quiz = {
	round: 1
};

var quizStart = function() {

	if (!$('#players-chosen option').length) {
		error('Nie wybrano graczy!', true);
	} else {
		var questionsId = $('#questions-choice').find(':selected')[0].getAttribute('value');
		var author = questions[questionsId].author;
		$('#players-chosen option').each(function() {
			if ($(this).text().toLowerCase() == author.toLowerCase())
				playerMoveToRight(this);
		});
		if ($('#players-chosen option').length == 0)
			error('Nie wybrano graczy!', true);
		else {
			var rows = db.query('players', {name: questions[questionsId].author});
			if (!rows.length) {
				error('Autora konkursu brak w bazie danych! Tak nie można no!', true);
			} else {
				var gameCode = questions[questionsId].code;
				var rows = db.query('games', {game_code: gameCode});
				if (rows.length == 0 || (rows.length > 0 && confirm('Ten konkurs był już rozgrywany. Na pewno rozpocząć grę?'))) {
					startGameProgress(questionsId);
				}
			}
		}
	}

};

var checkQuizProgress = function() {

	var rows = db.query('games', {finished: 'false'});
	var rowsOvertime = db.query('games', {finished: 'overtime'});
	if (rows.length) {
		if (rows.length > 1) {
			error('Za dużo konkursów w toku. Srsly, weź pan zerknij w te baze...', true);
		} else {
			restoreGameProgress(rows[0]);
		}
	} else {
		if (rowsOvertime.length) {
			if (rowsOvertime.length > 1) {
				error('Za dużo dogrywek w toku. Srsly, weź pan zerknij w te baze...', true);
			} else {
				restoreOvertimeProgress(rowsOvertime[0]);
			}
		} else {
			clearMainPage();
		}
	}

};

var restoreGameProgress = function(game) {

	$('div#main').css('padding-top', '10px');
	$('#quiz-info').show();
	$('.quiz-info-dash').show();
	$('#get-question').show();
	$('#tools-button').hide();
	$('#quiz-start').hide();
	$('#cinema-light').show();
	quiz.gameId = game.ID;
	for (var i = 0; i < questions.length; i++) {
		if (questions[i].code == game.game_code) {
			quiz.questions = questions[i].questions;
			quiz.qsId = i;
			quiz.code = questions[i].code;
			quiz.buttons = questions[i].buttons;
		}
	}
	for (var i = 0; i < quiz.questions.length; i++) {
		quiz.questions[i].used = false;
	}
	var players = db.query('players_games', {id_game: quiz.gameId});
	players.sort(function(a, b) {
		if (a.order < b.order)
			return -1;
		else if (a.order == b.order)
			return 0;
		else if (a.order > b.order)
			return 1;
	});
	quiz.players = players;
	var rounds = db.query('game_rounds', {id_game: quiz.gameId});
	rounds.sort(function(a, b) {
		if (a.round < b.round)
			return -1;
		else if (a.round == b.round)
			return 0;
		else if (a.round > b.round)
			return 1;
	});
	for (var i = 0; i < rounds.length; i++) {
		quiz.round = rounds[i].round;
		var roundQuestions = rounds[i].questions.split('-');
		quiz.currentPlayer = -1;
		for (var j = 0; j < roundQuestions.length; j++) {
			if (roundQuestions[j] != '') {
				var answeredQuestionId = roundQuestions[j];
				var answeredQuestion = findQuestion(answeredQuestionId);
				quiz.currentPlayer++;
				quiz.questions[answeredQuestion.pos].used = true;
			}
		}
	}
	
	var roundAnswers = rounds[rounds.length - 1].answers.split('-');
/*	quiz.currentPlayer = 0;
	for (var i = 0; i < roundAnswers.length; i++) {
		if (roundAnswers[i] != '') {
			quiz.currentPlayer++;
			if (quiz.currentPlayer > quiz.players.length - 1)
				quiz.currentPlayer = 0;
		}
	}*/
	var roundQuestions = rounds[rounds.length - 1].questions.split('-');
	if (roundAnswers.length == roundQuestions.length) {
		var unansweredQuestionId = roundQuestions.pop();
		while (unansweredQuestionId == '')
			unansweredQuestionId = roundQuestions.pop();
		var unansweredQuestion = findQuestion(unansweredQuestionId);
		quiz.currentQuestion = unansweredQuestion.pos;
		showQuestion(unansweredQuestion.question, true);
		showAnswer(unansweredQuestion.question, true);
		updateQuizInfo(quiz.qsId);
		togglePointButtons();
	} else {
		var unansweredQuestionId = roundQuestions.pop();
		while (unansweredQuestionId == '')
			unansweredQuestionId = roundQuestions.pop();
		var unansweredQuestion = findQuestion(unansweredQuestionId);
		quiz.currentQuestion = unansweredQuestion.pos;
		showQuestion(unansweredQuestion.question, true);
		updateQuizInfo(quiz.qsId);
		$('#get-answer').show();
	}
	if (canQuizBeFinishedBeforetime())
		$('#end-quiz').show();
	else
		$('#end-quiz').hide();
	showCancelButton();
	
};

var findQuestion = function(qId) {

	var found = null;
	if (quiz.questions) {
		for (var i = 0; i < quiz.questions.length; i++) {
			if (quiz.questions[i].id == qId)
				found = {
					pos: i,
					question: quiz.questions[i]
				};
		}
	}
	return found;

};

var startGameProgress = function(qsId) {

	clearMainPage();
	$('div#main').css('padding-top', '10px');
	quiz.questions = questions[qsId].questions;
	quiz.qsId = qsId;
	quiz.code = questions[qsId].code;
	quiz.buttons = questions[qsId].buttons;
	for (var i = 0; i < quiz.questions.length; i++) {
		quiz.questions[i].used = false;
	}
	newQuiz(quiz.qsId);
	$('#quiz-info').show();
	$('.quiz-info-dash').show();
	$('#get-question').show();
	$('#tools-button').hide();
	$('#quiz-start').hide();
	$('#cinema-light').show();
	nextQuestion();

};

var nextQuestion = function() {

	var newQuestion = Math.floor(Math.random() * quiz.questions.length);
	while (quiz.questions[newQuestion].used)
		newQuestion = Math.floor(Math.random() * quiz.questions.length);
	showQuestion(quiz.questions[newQuestion]);
	quiz.questions[newQuestion].used = true;
	quiz.currentQuestion = newQuestion;
	updateQuizInfo(quiz.qsId);
	$('#get-answer').show();
	if (canQuizBeFinishedBeforetime())
		$('#end-quiz').show();
	else
		$('#end-quiz').hide();
	showCancelButton();

};

var questionAnswered = function() {

	$('#get-answer').hide();
	$('#end-quiz').hide();
	togglePointButtons();
	showAnswer(quiz.questions[quiz.currentQuestion]);

};

var answeredCorrectly = function(points) {

	if (typeof points == 'undefined')
		points = 1;
	var question = quiz.questions[quiz.currentQuestion];
	player = quiz.players[quiz.currentPlayer];
	if (!quiz.overtime) {
		db.insert('points', {id_player: player.id_player, id_game: quiz.gameId, id_question: question.id, points: points.toString()});
		db.commit();
	} else {
		Overtime.updateOvertimePlayer(quiz.gameId, player.id_player, {state: 'ok', points: 1});
	}
	endRound();

};

var answeredIncorrectly = function() {

	var question = quiz.questions[quiz.currentQuestion];
	player = quiz.players[quiz.currentPlayer];
	if (!quiz.overtime) {
		db.insert('points', {id_player: player.id_player, id_game: quiz.gameId, id_question: question.id, points: '0'});
		db.commit();
	} else {
		Overtime.updateOvertimePlayer(quiz.gameId, player.id_player, {state: 'buffer'});
	}
	endRound();
	
};

var questionsLeft = function() {

	var result = quiz.questions.length;
	for (var i = 0; i < quiz.questions.length; i++) {
		if (quiz.questions[i].used)
		result--;
	}
	return result;

};

var roundsLeft = function() {

	return Math.floor((questionsLeft() + 1 + quiz.currentPlayer) / quiz.players.length) - 1;

};

var endRound = function() {

	togglePointButtons(false);
	quiz.currentPlayer = getNextPlayer();
	if (quiz.currentPlayer > getPlayers().length - 1) {
		if (quiz.overtime) {
			var places = endOvertimeRound();
			if (isPodiumComplete(places))
				return endQuiz(true, places);
		}
		quiz.currentPlayer = 0;
		if (questionsLeft() < quiz.players.length) {
			if (quiz.overtime)
				return endQuiz(true, places);
			else
				return endQuiz(true);
		} else {
			quiz.round++;
		}
	}
	showPewDiePie(true);

};

var showPewDiePie = function(noPewds) {

	$('#image-container').empty();
	$('#movie-container').empty();
	$('#audio-container').empty();
	$('#question-text').empty();
	if (!noPewds) {
		var mp4 = document.createElement('video');
		mp4.className = 'question-video';
		if (config.lakeQuiz) {
			if (quiz.questions.length - questionsLeft() == 29) {
				mp4.src = 'images/spahkh.mp4';
			} else if (quiz.questions.length - questionsLeft() == 73) {
				mp4.src = 'images/whaa.mp4';
			} else {
				mp4.src = 'images/pewds.mp4';
			}
		} else {
			mp4.src = 'images/pewds.mp4';
		}
		$(mp4).bind('ended', function() {
			nextQuestion();	
		});
		$('#movie-container').append(mp4);
		$('#movie-container').show();
		mp4.play();
	} else {
		nextQuestion();
	}
};

var canQuizBeFinishedBeforetime = function() {

	return quiz.currentPlayer == 0 && quiz.round > 1 && $('#get-answer').is(':visible') && !quiz.overtime;

};

var endQuiz = function(dontAsk, places) {
	if (dontAsk || (confirm('Czy na pewno zakończyć grę?') && confirm('Czy na pewno NA PEWNO zakończyć grę?'))) {
		db.update('games', {ID: quiz.gameId}, function(row) {
			row.finished = 'true';
			return row;
		});
		db.commit();
		$('#quiz-info-bottom').hide();
		$('#image-container').hide();
		$('#movie-container').hide();
		$('#audio-container').hide();
		$('#question-text').hide();
		$('#cat-text').hide();
		$('#quiz-text-bottom').hide();
		$('#end-quiz').hide();
		$('#get-question').hide();
		$('#get-answer').hide();
		togglePointButtons(false);
		$('#cancel-answer').hide();
		results = getResults();
		if (typeof places == 'undefined')
			var places = pointsToPlaces(results);
		var placesCount = 0;
		for (var i = 1; i < 4; i++)
			placesCount += places[i].length;
		if (isPodiumComplete(places)) {
			showWinner(places);
		} else if (questionsLeft() < placesCount) {
			cannotDoOvertime(places);
		} else {
			startOvertime(places);
		}
		
	}

};

const showQuestion = (question, noDatabase) => {
	debug('This question: ');
	debug(question);
	debug('---------------------------------------------------');
	if (typeof noDatabase == 'undefined')
		noDatabase = false;
	$('#image-container').hide();
	$('#movie-container').hide();
	$('#audio-container').hide();
	$('#question-text').empty();
	$('#logo-image').hide();
	$('#question-text').html(question.questionText);
	$('#question-text').show();
	if (typeof question.category != 'undefined' && question.category.length) {
		$('#cat-text').html('Kategoria: ' + question.category).show();
	}
	if (config.imageTypes.includes(question.questionType.toLowerCase().trim())) {
		createImageContainer(quiz.code, question.id, question.questionType);
	} else if (question.questionType.toLowerCase().trim() == 'mp4') {
		createMovieContainer(quiz.code, question.id);
	} else if (question.questionType.toLowerCase().trim() == 'mp3') {
		createAudioContainer(quiz.code, question.id);
	}
	if (!noDatabase) {
		if (quiz.currentPlayer == 0) {
			db.insert('game_rounds', {id_game: quiz.gameId, round: quiz.round, questions: '-', answers: '-'});
		}
		db.update('game_rounds', {id_game: quiz.gameId, round: quiz.round}, function(row) {
			row.questions += question.id + '-';
			return row;
		});
		db.commit();
	}
};

const createImageContainer = (quizCode, questionId, imageType, isAnswer = false) => {
	const image = document.createElement('img');
	image.className = 'question-image';
	const lastPart = (isAnswer) ? 'a.' + imageType : '.' + imageType;
	image.src = 'pytania/' + quizCode + '/' + questionId + lastPart;
	const imageContainer = $('#image-container');
	imageContainer.empty();
	imageContainer.append(image);
	imageContainer.show();
};

const createMovieContainer = (quizCode, questionId, isAnswer = false) => {
	const movieContainer = $('#movie-container');
	let movieOverlay;
	if (!isAnswer) {
		movieOverlay = document.createElement('div');
		movieOverlay.setAttribute('id', 'movie-overlay');
		movieContainer.append(movieOverlay);
	}
	const movieContent = document.createElement('div');
	movieContent.setAttribute('id', 'movie-content');
	movieContainer.append(movieContent);
	const mp4 = document.createElement('video');
	mp4.setAttribute('controls', 'controls');
	mp4.className = 'question-video';
	const lastPart = (isAnswer) ? 'a.mp4' : '.mp4';
	mp4.src = 'pytania/' + quizCode + '/' + questionId + lastPart;
	$(movieContent).append(mp4);
	movieContainer.show();
	if (!isAnswer) {
		$(movieOverlay).css('height', $('#movie-container-content > video').css('height'));
		$(mp4).on('play', () => {
			$(movieOverlay).hide();
		});
	}
};

const createAudioContainer = (quizCode, questionId, isAnswer = false) => {
	const mp3 = document.createElement('audio');
	mp3.setAttribute('controls', 'controls');
	mp3.className = 'question-audio';
	const lastPart = (isAnswer) ? 'a.mp3' : '.mp3';
	mp3.src = 'pytania/' + quizCode + '/' + questionId + lastPart;
	const audioContainer = $('#audio-container');
	audioContainer.empty();
	audioContainer.append(mp3);
	audioContainer.show();
};

const showAnswer = (question, noDatabase) => {
	if (question.answerType !== 'same') {
		$('#image-container').empty();
		$('#movie-container').empty();
		$('#audio-container').empty();
	}
	$('#question-text').empty();
	$('#cat-text').empty().hide();
	$('#logo-image').hide();
	if (question.answerText != '')
		$('#question-text').html(question.answerText);
	$('#question-text').show();
	if (config.imageTypes.includes(question.answerType)) {
		createImageContainer(quiz.code, question.id, question.answerType, true);
	} else if (question.answerType == 'mp4') {
		createMovieContainer(quiz.code, question.id, true);
	} else if (question.answerType == 'mp3') {
		createAudioContainer(quiz.code, question.id, true);
	}
	if (!noDatabase) {
		db.update('game_rounds', {id_game: quiz.gameId, round: quiz.round}, function(row) {
			row.answers += question.id + '-';
			return row;
		});
		db.commit();
	}

};

var getCurrentPlayerName = function(playerNumber) {

	var pChosen = db.query('players_games', {id_game: quiz.gameId});
	if (pChosen.length) {
		if (quiz.overtime)
			var player = db.query('players', {ID: quiz.players[playerNumber].id_player});
		else
			var player = db.query('players', {ID: pChosen[playerNumber].id_player});
		player = player.pop();
		return player.name;
	}
	

};

var newQuiz = function(qsId) {

	var gameId = db.insert('games', {game_code: questions[qsId].code, finished: 'false'});
	var pChosen = db.query('players_chosen');
	pChosen = randomizeArray(pChosen);
	quiz.gameId = gameId;
	quiz.players = pChosen;
	for (var i = 0; i < pChosen.length; i++) {
		db.insert('players_games', {id_game: gameId, id_player: pChosen[i].id_player, order: i+1});
	}
	quiz.currentPlayer = 0;
	db.commit();

};

var randomizeArray = function(array) {

	var newArray = [];
	for (var i = 0; i < array.length; i++) {
		var newPos = Math.floor(Math.random() * array.length);
		while (typeof newArray[newPos] != 'undefined')
			newPos = Math.floor(Math.random() * array.length);
		newArray[newPos] = array[i];
	}
	return newArray;
	
};

var updateQuizInfo = function(qsId) {

	var currentPlayer = '';
	if (typeof quiz.currentPlayer != 'undefined')
		currentPlayer = '<div class="info-quiz" id="info-quiz-player">Odpowiada: <strong>' + getCurrentPlayerName(quiz.currentPlayer) + '</strong></div>';
	var roundInfo = '<div class="info-quiz" id="info-quiz-round">Kolejka: <strong>' + quiz.round + '</strong></div>';
	var questionsInfo = '<div class="info-quiz" id="info-quiz-questions-left">Pozostało pytań: <strong>' + questionsLeft() + '</strong> (kolejek: <strong>' + roundsLeft() + '</strong>)</div>';
	var msg = '<div class="info-quiz" id="info-quiz-name">Tytuł: <strong>' + questions[qsId].title + '</strong></div>';
	if (!quiz.overtime) {
		msg += roundInfo + questionsInfo;
	} else {
		var overtimeNames = '<div class="info-quiz" id="info-overtime-names">W dogrywce: ';
		var overtimePlayers = Overtime.getAllOvertimePlayers(quiz.gameId);
		for (var i = 0; i < overtimePlayers.length; i++) {
			var playerName = db.query('players', {ID: overtimePlayers[i].id_player});
			overtimeNames += '<strong>' + playerName[0].name + '</strong>, ';
		}
		overtimeNames = overtimeNames.substr(0, overtimeNames.length - 2) + '</div>';
		msg += overtimeNames;
	}
		
	msg += currentPlayer;
	$('#quiz-info').html(msg);

};

var clearMainPage = function() {
	$('#tools-button').show();
	$('#logo-image').show();
	$('#quiz-start').show();
	$('#get-question').hide();
	$('#get-answer').hide();
	togglePointButtons(false);
	$('#end-quiz').hide();
	$('#image-container').hide();
	$('#audio-container').hide();
	$('#movie-container').hide();
	$('#question-text').hide();
	$('#cat-text').hide();
	$('#quiz-info').hide();
	$('#cancel-answer').hide();

};

var showCancelButton = function() {

	if (quiz.overtime)
		return false;
	var canBeShown = false;
	if (quiz.currentPlayer != 0 || quiz.round > 1) {
		var points = db.query('points', {'id_game': quiz.gameId});
		var pointsLength = points.length;
		for (var i = 0; i < pointsLength; i++) {
			var pointEntry = points.pop();
			pointEntry.points = parseFloat(pointEntry.points);
			if (pointEntry.points > 0) {
				canBeShown = true;
				break;
			} else if (pointEntry.points == 0 && pointEntry.cancelled == true) {
				canBeShown = false;
				break;
			}
		}
	}
	if (canBeShown)
		$('#cancel-answer').show();
	else
		$('#cancel-answer').hide();

};
	
var cancelAnswer = function() {

	if (confirm('Na pewno usunąć ostatnio zdobyty punkt?')) {
		var points = db.query('points', function(row) {
			if (row.id_game == quiz.gameId && parseFloat(row.points) > 0)
				return true;
			else
				return false;
		});
		points.sort(function(a, b) {
			if (a.ID > b.ID)
				return -1;
			else if (a.ID == b.ID)
				return 0;
			else if (a.ID < b.ID)
				return 1;
		});
		if (points.length) {
			db.update('points', {ID: points[0].ID}, function(row) {
				row.points = '0';
				row.cancelled = true;
				return row;
			});
			db.commit();
			$('#cancel-answer').hide();
			error('Punkt usunięto.', true);
		}
		
	}

};

var togglePointButtons = function(state) {

	if (typeof state == 'undefined')
		state = true;
	if (state) {
		$('#answered-one').show();
		if (typeof quiz.overtime == 'undefined' || !quiz.overtime) {
			for (i = 0; i < quiz.buttons.length; i++) {
				$('#' + quiz.buttons[i]).show();
			}
		}
		$('#not-answered').show();
	} else {
		$('#answered-one').hide();
		$('#answered-half').hide();
		$('#answered-two').hide();
		$('#answered-onehalf').hide();
		$('#not-answered').hide();
	}

};

var getResults = function() {

	var result = [];
	var points = db.query('points', {id_game: quiz.gameId});
	var players = db.query('players');
	var playersGames = db.query('players_games', {id_game: quiz.gameId});
	var playersParticipating = [];
	for (var i = 0; i < players.length; i++) {
		for (var j = 0; j < playersGames.length; j++) {
			if (players[i].ID == playersGames[j].id_player)
				playersParticipating.push(players[i]);
		}
	}
	players = playersParticipating;
	for (var i = 0; i < players.length; i++) {
		result[players[i].ID] = {
			ID: players[i].ID,
			name: players[i].name,
			points: 0
		};
	}
	for (var i = 0; i < points.length; i++) {
		result[points[i].id_player].points += parseFloat(points[i].points);
	}
	result.sort(function(a, b) {
		if (a.points < b.points) {
			return 1;
		} else if (a.points == b.points) {
			return 0;
		} else if (a.points > b.points) {
			return -1;
		}
	});
	return result;

};

var pointsToPlaces = function(result) {

	var places = {
		1: [],
		2: [],
		3: [],
		count: 0,
	};
	var maxPoints = result[0].points;
	places[1].push(result[0]);
	places.count++;
	var currentPlace = 1;
	var nextPlace = 2;
	for (var i = 1; i < result.length; i++) {
		if (typeof result[i] != 'undefined') {
			if (places[currentPlace].length > 1) {
				nextPlace++;
			}
			if (places[currentPlace].length > 2) {
				nextPlace += 2;
			}
			if (result[i].points == maxPoints) {
				places[currentPlace].push(result[i]);
				places.count++;
			} else {
				currentPlace = nextPlace;
				if (currentPlace > 3)
					break;
				places[currentPlace].push(result[i]);
				places.count++;
				maxPoints = result[i].points;
				nextPlace++;
 			}
		}
	}

	return places;

};

var isPodiumComplete = function(places) {

	result = true;
	for (var i = 1; i < 4; i++) {
		result = result && places[i].length == 1;
	}
	return result;

};

var showWinner = function(results) {

	debug('showWinner-- results:');
	for (i = 1; i < 4; i++) {
		debug('Place number: ' + i + ' has ' + results[i][0].points);
	}
	if (typeof results[1][0].name == 'undefined') {
		var resultsCopy = [];
		for (i = 1; i < 4; i++) {
			var players = db.query('players', {ID: results[i][0].id_player});
			results[i][0].name = players[0].name;
			if (results[i][0].points && parseFloat(results[i][0].points) > 0) {
				results[i][0].overtimePoints = ' (+' + parseFloat(results[i][0].points) + ')';
			}
			results[i][0].points = Stats.getPlayersPointsInGame(results[i][0].id_player, quiz.gameId);
		}
	}
	for (var i = 1; i < 4; i++) {
		if (typeof results[i] != 'undefined' && typeof results[i][0].overtimePoints == 'undefined')
			results[i][0].overtimePoints = '';
	}
	$('#quiz-info').html('<h2>Zwycięzcą, po bojach i znojach, zostaje:</h2><h1>'
		+ results[1][0].name + '</h1><h2>zdobywszy ' + results[1][0].points + ' ' + pointsToWords(results[1][0].points) + results[1][0].overtimePoints
		+ '!</h2><h2>Gratulacje od samego Nicolasa Cage\'a!</h2>'
		+ '<div><img src="images/nic_05.jpg" /></div>'
		+ '<h4>Miejsce drugie: <strong>' + results[2][0].name + '</strong> (' + results[2][0].points + ' ' + pointsToWords(results[2][0].points) + ')' + results[2][0].overtimePoints + '</h4>'
		+ '<h5>Miejsce trzecie: <strong>' + results[3][0].name + '</strong> (' + results[3][0].points + ' ' + pointsToWords(results[3][0].points) + ')' + results[3][0].overtimePoints + '</h5>'
	);
	$('#quiz-info').show();
	var mp3 = document.createElement('audio');
	mp3.style.display = 'none';
	mp3.src = 'images/victory.mp3';
	$('#quiz-info').append(mp3);
	mp3.play();

};

var getNextPlayer = function() {

	quiz.currentPlayer++;
	return quiz.currentPlayer;

};

var getPlayers = function() {

	return quiz.players;

};

var startOvertime = function(places) {

	quiz.round++;
	for (var i = 1; i < 4; i++) {
		if (places[i].length > 0)
			for (var j = 0; j < places[i].length; j++) {
				var playerOrder = Overtime.getMaxPlayerOrder(quiz.gameId);
				Overtime.addOvertimePlayer(quiz.gameId, places[i][j].ID, i, playerOrder + 1);
			}
	}
	quiz.players = Overtime.getOvertimePlayers(quiz.gameId);
	quiz.currentPlayer = 0;
	quiz.overtime = true;
	db.update('games', {ID: quiz.gameId}, function(row) {
		row.finished = 'overtime';
		return row;
	});
	showPewDiePie(true);
	displayOvertimeMessage(quiz.gameId);

};

var endOvertimeRound = function() {

	var places = Overtime.getPlaces(quiz.gameId);
	var buffer = Overtime.getBuffer(quiz.gameId);
	for (var i = 3; i > 0; i--) {
		if (places[i].length == 0) {
			if (buffer[i].length > 0) {
				Overtime.fromBufferToPlaces(quiz.gameId, buffer[i]);
			}
		} else {
			if (buffer[i].length > 0) {
				Overtime.fromBufferToLowerLevel(quiz.gameId, buffer[i], places[i].length);
			}
		}
	}
	quiz.players = Overtime.getOvertimePlayers(quiz.gameId);
	return Overtime.getPlaces(quiz.gameId);

};

var cannotDoOvertime = function() {

	Stats.gamePointsModal();
	return error('Za mało pytań, by przeprowadzić dogrywkę', true);

};

var restoreOvertimeProgress = function() {

	

};

var displayOvertimeMessage = function(game) {

	var places = Overtime.getPlaces(game);
	var msg_place = ['', '', ''];
	for (var i = 1; i < 4; i++) {
		if (places[i].length > 1) {
			for (var j = 0; j < places[i].length; j++) {
				if (msg_place[i - 1] == '') {
					switch (i) {
						case 1:
							msg_place[i - 1] = '<p style="color: black;">O miejsce pierwsze rywalizują: ';
							break;
						case 2:
							msg_place[i - 1] = '<p style="color: black">O miejsce drugie rywalizują: ';
							break;
						case 3:
							msg_place[i - 1] = '<p style="color: black">O miejsce trzecie rywalizują: ';
							break;
					}
				}
				var player = db.query('players', {ID: places[i][j].id_player});
				msg_place[i - 1] += '<strong>' + player[0].name + '</strong>' + ', ';
			}
			msg_place[i - 1] = msg_place[i - 1].substr(0, msg_place[i - 1].length - 2) + '.</p>';
		}
	}
	var msg = '<h3 style="text-align: center;">Dogrywka!</h3>';
	msg += msg_place.join('');
	$('#error-message p#message').empty().html(msg);
	$('#error-message').modal();

};

const debug = () => {
	if (config.debugMode && console && console.log) {
		console.log.apply(console, arguments);
	}
};