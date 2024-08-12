const Quiz = {

	round: 1,

	get inProgress() {
		return typeof this.gameId != 'undefined' && this.gameId != '';
	}
};

const quizStart = () => {

	if (!$('#players-chosen option').length) {
		error('Nie wybrano graczy!', true);
	} else {
		var questionsId = $('#questions-choice').find(':selected')[0].getAttribute('value');
		var author = quizzes[questionsId].author;
		$('#players-chosen option').each(function() {
			if ($(this).text().toLowerCase() == author.toLowerCase())
				playerMoveToRight(this);
		});
		if ($('#players-chosen option').length == 0)
			error('Nie wybrano graczy!', true);
		else {
			var rows = db.query('players', {name: quizzes[questionsId].author});
			if (!rows.length) {
				error('Autora konkursu brak w bazie danych! Tak nie można no!', true);
			} else {
				var gameCode = quizzes[questionsId].code;
				var rows = db.query('games', {game_code: gameCode});
				if (rows.length == 0 || (rows.length > 0 && confirm('Ten konkurs był już rozgrywany. Na pewno rozpocząć grę?'))) {
					startGameProgress(questionsId);
				}
			}
		}
	}

};

const checkQuizProgress = () => {
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

const restoreGameProgress = (game) => {

	$('div#main').css('padding-top', '10px');
	$('#quiz-info').show();
	$('.quiz-info-dash').show();
	$('#get-question').show();
	$('#tools-button').hide();
	$('#quiz-start').hide();
	$('#cinema-light').show();
	Quiz.gameId = game.ID;
	const index = quizzes.findIndex((quiz) => quiz.code == game.game_code);
	Quiz.questions = quizzes[index].questions;
	Quiz.qsId = index;
	Quiz.code = quizzes[index].code;
	Quiz.buttons = quizzes[index].buttons;
	Quiz.questions.forEach((question) => {
		question.used = false;
	});
	var players = db.query('players_games', {id_game: Quiz.gameId});
	players.sort(function(a, b) {
		if (a.order < b.order)
			return -1;
		else if (a.order == b.order)
			return 0;
		else if (a.order > b.order)
			return 1;
	});
	Quiz.players = players;
	var rounds = db.query('game_rounds', {id_game: Quiz.gameId});
	rounds.sort(function(a, b) {
		if (a.round < b.round)
			return -1;
		else if (a.round == b.round)
			return 0;
		else if (a.round > b.round)
			return 1;
	});
	rounds.forEach((round) => {
		Quiz.round = round.round;
		const roundQuestions = round.questions.split('-');
		Quiz.currentPlayer = -1;
		roundQuestions.forEach((roundQuestion) => {
			if (roundQuestion != '') {
				const answeredQuestionId = roundQuestion;
				const answeredQuestion = findQuestion(answeredQuestionId);
				Quiz.currentPlayer++;
				Quiz.questions[answeredQuestion.pos].used = true;
			}
		});
	});
	
	var roundAnswers = rounds[rounds.length - 1].answers.split('-');
/*	Quiz.currentPlayer = 0;
	for (let i = 0; i < roundAnswers.length; i++) {
		if (roundAnswers[i] != '') {
			Quiz.currentPlayer++;
			if (Quiz.currentPlayer > Quiz.players.length - 1)
				Quiz.currentPlayer = 0;
		}
	}*/
	var roundQuestions = rounds[rounds.length - 1].questions.split('-');
	if (roundAnswers.length == roundQuestions.length) {
		var unansweredQuestionId = roundQuestions.pop();
		while (unansweredQuestionId == '')
			unansweredQuestionId = roundQuestions.pop();
		var unansweredQuestion = findQuestion(unansweredQuestionId);
		Quiz.currentQuestion = unansweredQuestion.pos;
		showQuestion(unansweredQuestion.question, true);
		showAnswer(unansweredQuestion.question, true);
		updateQuizInfo(Quiz.qsId);
		togglePointButtons();
	} else {
		var unansweredQuestionId = roundQuestions.pop();
		while (unansweredQuestionId == '')
			unansweredQuestionId = roundQuestions.pop();
		var unansweredQuestion = findQuestion(unansweredQuestionId);
		Quiz.currentQuestion = unansweredQuestion.pos;
		showQuestion(unansweredQuestion.question, true);
		updateQuizInfo(Quiz.qsId);
		$('#get-answer').show();
	}
	if (canQuizBeFinishedBeforetime())
		$('#end-quiz').show();
	else
		$('#end-quiz').hide();
	showCancelButton();
	
};

const findQuestion = (qId) => {
	if (Quiz.questions) {
		const index =  Quiz.questions.findIndex((question) => {
			question.id == qId;
		});
		return {
			pos: index,
			question: Quiz.questions[index]
		};
	} else {
		return undefined;
	}
};

const startGameProgress = (qsId) => {

	clearMainPage();
	$('div#main').css('padding-top', '10px');
	Quiz.questions = quizzes[qsId].questions;
	Quiz.qsId = qsId;
	Quiz.code = quizzes[qsId].code;
	Quiz.buttons = quizzes[qsId].buttons;
	Quiz.questions.forEach((question) => {
		question.used = false;
	});
	newQuiz(Quiz.qsId);
	$('#quiz-info').show();
	$('.quiz-info-dash').show();
	$('#get-question').show();
	$('#tools-button').hide();
	$('#quiz-start').hide();
	$('#cinema-light').show();
	nextQuestion();

};

const nextQuestion = () => {
	const unusedQuestions = Quiz.questions.filter(q => !q.used);
	const newQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
	showQuestion(newQuestion);
	newQuestion.used = true;
	Quiz.currentQuestion = newQuestion;
	updateQuizInfo(Quiz.qsId);
	$('#get-answer').show();
	if (canQuizBeFinishedBeforetime())
		$('#end-quiz').show();
	else
		$('#end-quiz').hide();
	showCancelButton();
};

const questionAnswered = () => {
	$('#get-answer').hide();
	$('#end-quiz').hide();
	togglePointButtons();
	showAnswer(Quiz.questions[Quiz.currentQuestion]);
};

const answeredCorrectly = (points) => {
	if (typeof points == 'undefined')
		points = 1;
	var question = Quiz.questions[Quiz.currentQuestion];
	player = Quiz.players[Quiz.currentPlayer];
	if (!Quiz.overtime) {
		db.insert('points', {id_player: player.id_player, id_game: Quiz.gameId, id_question: question.id, points: points.toString()});
		db.commit();
	} else {
		Overtime.updateOvertimePlayer(Quiz.gameId, player.id_player, {state: 'ok', points: 1});
	}
	endRound();
};

const answeredIncorrectly = () => {
	const question = Quiz.questions[Quiz.currentQuestion];
	player = Quiz.players[Quiz.currentPlayer];
	if (!Quiz.overtime) {
		db.insert('points', {id_player: player.id_player, id_game: Quiz.gameId, id_question: question.id, points: '0'});
		db.commit();
	} else {
		Overtime.updateOvertimePlayer(Quiz.gameId, player.id_player, {state: 'buffer'});
	}
	endRound();
};

const questionsLeft = () => {
	return Quiz.questions.filter(q => !q.used).length;
};

const roundsLeft = () => {
	return Math.floor((questionsLeft() + 1 + Quiz.currentPlayer) / Quiz.players.length) - 1;
};

const endRound = () => {
	togglePointButtons(false);
	Quiz.currentPlayer = getNextPlayer();
	if (Quiz.currentPlayer > getPlayers().length - 1) {
		if (Quiz.overtime) {
			var places = endOvertimeRound();
			if (isPodiumComplete(places))
				return endQuiz(true, places);
		}
		Quiz.currentPlayer = 0;
		if (questionsLeft() < Quiz.players.length) {
			if (Quiz.overtime)
				return endQuiz(true, places);
			else
				return endQuiz(true);
		} else {
			Quiz.round++;
		}
	}
	showPewDiePie(true);

};

const showPewDiePie = (noPewds) => {

	$('#image-container').empty();
	$('#movie-container').empty();
	$('#audio-container').empty();
	$('#question-text').empty();
	if (!noPewds) {
		var mp4 = document.createElement('video');
		mp4.className = 'question-video';
		mp4.src = 'images/pewds.mp4';
		$(mp4).on('ended', () => {
			nextQuestion();	
		});
		$('#movie-container').append(mp4);
		$('#movie-container').show();
		mp4.play();
	} else {
		nextQuestion();
	}
};

const canQuizBeFinishedBeforetime = () => {
	return Quiz.currentPlayer == 0 && Quiz.round > 1 && $('#get-answer').is(':visible') && !Quiz.overtime;

};

const endQuiz = (dontAsk, places) => {
	if (dontAsk || (confirm('Czy na pewno zakończyć grę?') && confirm('Czy na pewno NA PEWNO zakończyć grę?'))) {
		db.update('games', {ID: Quiz.gameId}, (row) => {
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
		for (let i = 1; i < 4; i++) {
			placesCount += places[i].length;
		}
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
		createImageContainer(Quiz.code, question.id, question.questionType);
	} else if (question.questionType.toLowerCase().trim() == 'mp4') {
		createMovieContainer(Quiz.code, question.id);
	} else if (question.questionType.toLowerCase().trim() == 'mp3') {
		createAudioContainer(Quiz.code, question.id);
	}
	if (!noDatabase) {
		if (Quiz.currentPlayer == 0) {
			db.insert('game_rounds', {id_game: Quiz.gameId, round: Quiz.round, questions: '-', answers: '-'});
		}
		db.update('game_rounds', {id_game: Quiz.gameId, round: Quiz.round}, (row) => {
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
		createImageContainer(Quiz.code, question.id, question.answerType, true);
	} else if (question.answerType == 'mp4') {
		createMovieContainer(Quiz.code, question.id, true);
	} else if (question.answerType == 'mp3') {
		createAudioContainer(Quiz.code, question.id, true);
	}
	if (!noDatabase) {
		db.update('game_rounds', {id_game: Quiz.gameId, round: Quiz.round}, (row) => {
			row.answers += question.id + '-';
			return row;
		});
		db.commit();
	}

};

const getCurrentPlayerName = (playerNumber) => {
	const participants = db.query('players_games', {id_game: Quiz.gameId});
	if (participants.length) {
		// TODO: Why the dichotomy?
		playerId = (Quiz.overtime) ? Quiz.players[playerNumber].id_player : participants[playerNumber].id_player;
		const player = db.query('players', {ID: playerId});
		player = player.pop();
		return player.name;
	}
};

const newQuiz = (qsId) => {
	var gameId = db.insert('games', {game_code: quizzes[qsId].code, finished: 'false'});
	var pChosen = db.query('players_chosen');
	pChosen = randomizeArray(pChosen);
	Quiz.gameId = gameId;
	Quiz.players = pChosen;
	pChosen.forEach((player) => {
		db.insert('players_games', {id_game: gameId, id_player: player.id_player, order: i+1});
	});
	Quiz.currentPlayer = 0;
	db.commit();
};

const randomizeArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
};

const updateQuizInfo = (qsId) => {

	var currentPlayer = '';
	if (typeof Quiz.currentPlayer != 'undefined')
		currentPlayer = '<div class="info-quiz" id="info-quiz-player">Odpowiada: <strong>' + getCurrentPlayerName(Quiz.currentPlayer) + '</strong></div>';
	var roundInfo = '<div class="info-quiz" id="info-quiz-round">Kolejka: <strong>' + Quiz.round + '</strong></div>';
	var questionsInfo = '<div class="info-quiz" id="info-quiz-questions-left">Pozostało pytań: <strong>' + questionsLeft() + '</strong> (kolejek: <strong>' + roundsLeft() + '</strong>)</div>';
	let msg = '<div class="info-quiz" id="info-quiz-name">Tytuł: <strong>' + quizzes[qsId].title + '</strong></div>';
	if (!Quiz.overtime) {
		msg += roundInfo + questionsInfo;
	} else {
		let overtimeNames = '<div class="info-quiz" id="info-overtime-names">W dogrywce: ';
		const overtimePlayers = Overtime.getAllOvertimePlayers(Quiz.gameId);
		overtimePlayers.forEach((player) => {
			const dbPlayers = db.query('players', {ID: player.id_player});
			overtimeNames += '<strong>' + dbPlayers[0].name + '</strong>, ';
		});
		overtimeNames = overtimeNames.slice(0, -2) + '</div>';
		msg += overtimeNames;
	}
		
	msg += currentPlayer;
	$('#quiz-info').html(msg);

};

const clearMainPage = () => {
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

const showCancelButton = () => {
	if (Quiz.overtime || (Quiz.currentPlayer == 0 && Quiz.round == 1)) {
		return;
	}

	const points = db.query('points', {'id_game': Quiz.gameId});
	const canBeShown = points.any((pointEntry) => {
		parseInt(pointEntry.points) > 0;
	});
	if (canBeShown) {
		$('#cancel-answer').show();
	} else {
		$('#cancel-answer').hide();
	}
};
	
const cancelAnswer = () => {
	if (confirm('Na pewno usunąć ostatnio zdobyty punkt?')) {
		var points = db.query('points', (row) => {
			if (row.id_game == Quiz.gameId && parseFloat(row.points) > 0)
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

const togglePointButtons = (state) => {
	if (typeof state == 'undefined')
		state = true;
	if (state) {
		$('#answered-one').show();
		if (typeof Quiz.overtime == 'undefined' || !Quiz.overtime) {
			for (i = 0; i < Quiz.buttons.length; i++) {
				$('#' + Quiz.buttons[i]).show();
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

const getResults = () => {
	var result = [];
	var points = db.query('points', {id_game: Quiz.gameId});
	var players = db.query('players');
	var playersGames = db.query('players_games', {id_game: Quiz.gameId});
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

const pointsToPlaces = (result) => {

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

const isPodiumComplete = (places) => {
	result = true;
	for (let i = 1; i < 4; i++) {
		result = result && places[i].length == 1;
	}
	return result;
};

const showWinner = (results) => {
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
			results[i][0].points = Stats.getPlayersPointsInGame(results[i][0].id_player, Quiz.gameId);
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

const getNextPlayer = () => {
	Quiz.currentPlayer++;
	return Quiz.currentPlayer;

};

const getPlayers = () => {
	return Quiz.players;
};

const startOvertime = (places) => {
	Quiz.round++;
	for (var i = 1; i < 4; i++) {
		if (places[i].length > 0)
			for (var j = 0; j < places[i].length; j++) {
				var playerOrder = Overtime.getMaxPlayerOrder(Quiz.gameId);
				Overtime.addOvertimePlayer(Quiz.gameId, places[i][j].ID, i, playerOrder + 1);
			}
	}
	Quiz.players = Overtime.getOvertimePlayers(Quiz.gameId);
	Quiz.currentPlayer = 0;
	Quiz.overtime = true;
	db.update('games', {ID: Quiz.gameId}, (row) => {
		row.finished = 'overtime';
		return row;
	});
	showPewDiePie(true);
	displayOvertimeMessage(Quiz.gameId);

};

const endOvertimeRound = () => {

	var places = Overtime.getPlaces(Quiz.gameId);
	var buffer = Overtime.getBuffer(Quiz.gameId);
	for (var i = 3; i > 0; i--) {
		if (places[i].length == 0) {
			if (buffer[i].length > 0) {
				Overtime.fromBufferToPlaces(Quiz.gameId, buffer[i]);
			}
		} else {
			if (buffer[i].length > 0) {
				Overtime.fromBufferToLowerLevel(Quiz.gameId, buffer[i], places[i].length);
			}
		}
	}
	Quiz.players = Overtime.getOvertimePlayers(Quiz.gameId);
	return Overtime.getPlaces(Quiz.gameId);

};

const cannotDoOvertime = () => {

	Stats.gamePointsModal();
	return error('Za mało pytań, by przeprowadzić dogrywkę', true);

};

const restoreOvertimeProgress = () => {

	

};

const displayOvertimeMessage = (game) => {

	var places = Overtime.getPlaces(game);
	var msg_place = ['', '', ''];
	for (let i = 1; i < 4; i++) {
		if (places[i].length > 1) {
			for (let j = 0; j < places[i].length; j++) {
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