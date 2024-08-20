const Quiz = {

	round: 1,
	imageTypes: ['jpg', 'png', 'webp', 'gif', 'pre:question', 'pre:answer'],
	audioTypes: ['mp3', 'm4a'],
	videoTypes: ['mp4'],
	settings: new Settings(),

	get inProgress() {
		return typeof this.code !== 'undefined' && this.code != '';
	},

	get isFirstPlayer() {
		return !this.overtime && this.currentPlayerIndex == 0;
	},

	get currentPlayer() {
		return (this.overtime) ? this.overtime.findNextPlayer() : this.players[this.currentPlayerIndex];
	},

	get canBeFinished() {
		return this.isFirstPlayer && this.round > 1 && $('#getAnswer').is(':visible');
	}
};

const startQuiz = () => {
	if (!$('#players option').length) {
		error('Nie wprowadzono graczy!');
	} else if (DB.fetchAllPlayers().length < 3) {
		showToast('Wprowadź min. trzy drużyny.', 'error');
	} else {
		const quizCode = $('#questions-choice').find(':selected').first().data('quizCode');
		startGameProgress(quizCode);
	}
};

const checkQuizProgress = () => {
	const game = DB.fetchUnfinishedGame();
	if (game) {
		restoreGameProgress(game);
	} else {
		clearMainPage();
	}
};

const restoreGameProgress = (game) => {
	showEl('#quiz-info');
	showEl('#media-container > .quiz-info-line')
	hideEl('#tools-button');
	hideEl('#quizStart');
	showEl('#cinema-light');
	showEl('#show-points');
	const index = KTron.quizzes.findIndex((quiz) => quiz.code == game.game_code);
	Quiz.questions = KTron.quizzes[index].questions;
	Quiz.code = KTron.quizzes[index].code;
	Quiz.title = KTron.quizzes[index].title;
	const players = DB.fetchAllPlayers();
	Quiz.players = players;
	const usedQuestions = DB.fetchUsedQuestions();
	Quiz.questions = Quiz.questions.map((question) => {
		question['used'] = usedQuestions.includes(question.id);
		return question;
	});
	let questionToShow;
	if (game.status == 'overtime') {
		const overtime = DB.fetchOvertime();
		Quiz.overtime = overtime;
		const unusedQuestions = Quiz.questions.filter(q => !q.used);
		if (unusedQuestions.length == 0) {
			questionToShow = createFakeQuestion();
		} else {
			questionToShow = findQuestion(DB.fetchLastQuestion().id_question);
		}
	} else {
		const lastQuestion = DB.fetchLastQuestion();
		Quiz.currentPlayerIndex = Quiz.players.findIndex((player) => player.ID == lastQuestion.id_player);
		Quiz.round = DB.fetchLastRound();
		questionToShow = findQuestion(lastQuestion.id_question);
	}
	Quiz.currentQuestion = questionToShow;
	showQuestion(questionToShow);
	updateQuizInfo();
	showEl('#getAnswer');
	showEndQuizButton();
	showCancelButton();
};

const findQuestion = (questionId) => {
	if (Quiz.questions) {
		const question = Quiz.questions.find((question) => question.id == questionId);
		return question;
	} else {
		return undefined;
	}
};

const startGameProgress = (quizCode) => {
	clearMainPage();
	const quiz = KTron.quizzes.find((q) => q.code == quizCode);
	Quiz.questions = quiz.questions;
	Quiz.code = quizCode;
	Quiz.title = quiz.title;
	Quiz.questions.forEach((question) => {
		question.used = false;
	});
	newQuiz(quizCode);
	showEl('#quiz-info');
	showEl('#media-container > .quiz-info-line');
	hideEl('#tools-button');
	hideEl('#quizStart');
	showEl('#cinema-light');
	showEl('#show-points');
	nextQuestion();
};

const nextQuestion = () => {
	const unusedQuestions = Quiz.questions.filter(q => !q.used);
	if (unusedQuestions.length == 0) {
		Quiz.currentQuestion = createFakeQuestion();
		showQuestion(Quiz.currentQuestion);
	} else {
		const newQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
		DB.useUpQuestion(newQuestion, Quiz.currentPlayer);
		newQuestion.used = true;
		Quiz.currentQuestion = newQuestion;
		showQuestion(Quiz.currentQuestion);
	}
	if (Quiz.isFirstPlayer) {
		DB.startRound(Quiz.round);
	}
	updateQuizInfo();
	showEl('#getAnswer');
	showEndQuizButton();
	showCancelButton();
};

const createFakeQuestion = () => {
	return {
		id: -1,
		questionText: 'Prowadzący zadaje pytanie od czapy!',
		questionType: 'pre:question',
		answerText: '',
		answerType: 'pre:answer',
		used: false
	};
};

const questionAnswered = () => {
	hideEl('#getAnswer');
	hideEl('#endQuiz');
	togglePointButtons();
	showAnswer(Quiz.currentQuestion);
};

const answeredCorrectly = (points = 1) => {
	const player = Quiz.currentPlayer;
	if (!Quiz.overtime) {
		DB.addPoints(player, points);
	} else {
		DB.addPoints(player, 1, true);
		Quiz.overtime.markAnswer(player.ID, 'pass');
		DB.saveOvertime(Quiz.overtime);
	}
	endTurn();
};

const answeredIncorrectly = () => {
	const player = Quiz.currentPlayer;
	if (!Quiz.overtime) {
		DB.addPoints(player, 0);
	} else {
		DB.addPoints(player, 0, true);
		Quiz.overtime.markAnswer(player.ID, 'fail');
		DB.saveOvertime(Quiz.overtime);
	}
	endTurn();
};

const questionsLeft = () => {
	return Quiz.questions.filter(q => !q.used).length;
};

const roundsLeft = () => {
	return Math.floor((questionsLeft() + 1 + Quiz.currentPlayerIndex) / Quiz.players.length) - 1;
};

const endTurn = () => {
	togglePointButtons(false);
	if (!Quiz.overtime) {
		Quiz.currentPlayerIndex = getNextPlayer();
	}
	const nextRound = (Quiz.overtime) ? (Quiz.overtime.findNextPlayer() === undefined) : (Quiz.currentPlayerIndex == Quiz.players.length);
	if (nextRound) {
		if (Quiz.overtime) {
			Quiz.overtime.endRound();
			DB.saveOvertime(Quiz.overtime);
			debug('Zostało pytań: ', questionsLeft());
			debug('Graczy jest: ', Quiz.overtime.playersToBeAsked.length);
			if (Quiz.overtime.isPodiumComplete) {
				debug('Koniec tury dogrywki, jest podium')
				endQuiz(true, pointsToPlaces(getResults()));
				return;
			} else if (questionsLeft() > 0 && questionsLeft() < Quiz.overtime.playersToBeAsked.length) {
				debug('Za mało pytań na kolejną rundę dogrywki, wywalamy pozostałe w diabły');
				DB.useUpAllRemainingQuestions(Quiz.questions);
				Quiz.questions.forEach((question) => question.used = true);
			}
		} else {
			Quiz.currentPlayerIndex = 0;
			debug('Idziemy do kolejnej rundy');
			debug('Zostało pytań: ', questionsLeft());
			debug('Graczy jest: ', Quiz.players.length);
			if (questionsLeft() < Quiz.players.length) {
				debug('Za mało pytań w konkursie, wywalamy resztę i spróbujmy skończyć quiz.');
				DB.useUpAllRemainingQuestions(Quiz.questions);
				Quiz.questions.forEach((question) => question.used = true);
				endQuiz(true);
				return;
			} else {
				Quiz.round += 1;
			}
		}
	}
	nextTurn(nextRound);
};

const nextTurn = (nextRound = false) => {
	$('#image-container').empty();
	$('#movie-container').empty();
	$('#audio-container').empty();
	$('#question-text').empty();
	hideEl('#image-container');
	hideEl('#movie-container');
	hideEl('#audio-container');
	hideEl('#question-text');
	nextQuestion();
	if (!Quiz.overtime && Quiz.settings.showPointsAfterEachRound && nextRound) {
		showPointsModal();
	}
};

const endQuiz = (automatic = false, places = null) => {
	if (automatic || (confirm('Czy na pewno zakończyć grę?') && confirm('Czy na pewno NA PEWNO zakończyć grę?'))) {
		hideEl('#image-container');
		hideEl('#movie-container');
		hideEl('#audio-container');
		hideEl('#question-text');
		hideEl('#cat-text');
		hideEl('#endQuiz');
		hideEl('#getAnswer');
		togglePointButtons(false);
		hideEl('#cancelAnswer');
		if (Quiz.overtime) {
			DB.endQuiz();
			showWinner(Quiz.overtime.podium);
		} else {
			if (!places) {
				places = pointsToPlaces(getResults());
			}
			const overtime = new Overtime(places);
			if (overtime.isPodiumComplete) {
				debug('Quiz skończony, jest podium, kończymy to');
				DB.endQuiz();
				showWinner(places);
			} else {
				debug('Quiz skończony, nie ma podium, lecim w dogrywkę');
				if (!automatic) {
					debug('Quiz zakończony ręcznie, przywróć ostatnie pytanie');
					const lastUsedQuestionId = DB.restoreLastQuestion();
					if (lastUsedQuestionId) {
						Quiz.questions.filter((question) => question.id == lastUsedQuestionId).forEach((question) => question.used = false);
					}
				}
				startOvertime(overtime);
			}
		}
	}
};

const showQuestion = (question) => {
	debug('This question: ');
	debug(question);
	debug('---------------------------------------------------');
	hideEl('#image-container');
	hideEl('#movie-container');
	hideEl('#audio-container');
	$('#question-text').empty();
	hideEl('.quiz-main-logo');
	$('#question-text').html(question.questionText);
	showEl('#question-text');
	if (typeof question.category !== 'undefined' && question.category.length) {
		$('#cat-text').html('Kategoria: ' + question.category);
		showEl('#cat-text');
	}
	if (Quiz.imageTypes.includes(question.questionType)) {
		createImageContainer({code: Quiz.code, id: question.id, type: question.questionType, isAnswer: false});
	} else if (question.questionType.toLowerCase().trim() == 'mp4') {
		createVideoContainer(Quiz.code, question.id);
	} else if (question.questionType.toLowerCase().trim() == 'mp3') {
		createAudioContainer(Quiz.code, question.id);
	}
};

const createImageContainer = (data) => {
	const image = document.createElement('img');
	image.className = 'question-image';
	let src = '';
	if (data.type == 'pre:question') {
		src = 'res/pre_q.jpg';
	} else if (data.type == 'pre:answer') {
		src = 'res/pre_a.jpg';
	} else {
		const lastPart = (data.isAnswer) ? 'a.' + data.type : '.' + data.type;
		src = 'pytania/' + data.code + '/' + data.id + lastPart;
	}
	image.src = src;
	const imageContainer = $('#image-container');
	imageContainer.empty();
	imageContainer.append(image);
	const viewer = new Viewer(image, {
		navbar: false,
		toolbar: false,
		movable: false,
		viewed() {
			viewer.zoomTo(2);
		},
	  });
	showEl(imageContainer);
};

const createVideoContainer = (quizCode, questionId, isAnswer = false) => {
	const movieContainer = $('#movie-container');
	const movieContent = document.createElement('div');
	movieContent.setAttribute('id', 'movie-content');
	movieContainer.append(movieContent);
	let movieOverlay;
	if (!isAnswer) {
		movieOverlay = document.createElement('div');
		movieOverlay.setAttribute('id', 'movie-overlay');
		movieContent.append(movieOverlay);
		const iconContainer = document.createElement('div');
		iconContainer.className = 'container movie-overlay-icon-container';
		movieOverlay.append(iconContainer);
		const icon = document.createElement('i');
		icon.className = 'movie-overlay-icon bi bi-play-circle-fill';
		iconContainer.append(icon);
	}

	const mp4 = document.createElement('video');
	mp4.setAttribute('id', 'movie-video');
	mp4.setAttribute('controls', 'controls');
	mp4.className = 'question-video';
	const lastPart = (isAnswer) ? 'a.mp4' : '.mp4';
	mp4.src = 'pytania/' + quizCode + '/' + questionId + lastPart;
	$(movieContent).append(mp4);
	showEl(movieContainer);
	if (!isAnswer) {
		$(movieOverlay).css('height', $('#movie-container > video').css('height'));
		$(movieOverlay).on('click', (event) => {
			hideEl(movieOverlay);
			mp4.play();
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
	showEl(audioContainer);
};

const showAnswer = (question) => {
	$('#image-container').empty();
	$('#movie-container').empty();
	$('#audio-container').empty();
	hideEl('#image-container');
	hideEl('#movie-container');
	hideEl('#audio-container');
	$('#question-text').empty();
	hideEl('#cat-text');
	$('#cat-text').empty();
	hideEl('.quiz-main-logo');
	if (question.answerText != '') {
		$('#question-text').html(question.answerText);
	}
	showEl('#question-text');
	if (Quiz.imageTypes.includes(question.answerType)) {
		createImageContainer({code: Quiz.code, id: question.id, type: question.answerType, isAnswer: true});
	} else if (question.answerType == 'mp4') {
		createVideoContainer(Quiz.code, question.id, true);
	} else if (question.answerType == 'mp3') {
		createAudioContainer(Quiz.code, question.id, true);
	}
};

const newQuiz = (quizCode) => {
	const players = DB.createGame(quizCode);
	Quiz.players = players;
	Quiz.currentPlayerIndex = 0;
};

const randomizeArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

const updateQuizInfo = () => {
	let currentPlayer = '';
	if (typeof Quiz.currentPlayer !== 'undefined') {
		currentPlayer = '<div class="info-quiz" id="info-quiz-player"><div class="team-name-label">Odpowiada: </div><div class="team-name">' + Quiz.currentPlayer.name + '</div></div>';
	}
	let msg = '<div class="info-quiz" id="info-quiz-name">Tytuł: <strong>' + Quiz.title + '</strong></div>';
	if (!Quiz.overtime) {
		const roundInfo = '<div class="info-quiz" id="info-quiz-round">Kolejka: <strong>' + Quiz.round + '</strong></div>';
		const questionsInfo = '<div class="info-quiz" id="info-quiz-questions-left">Pozostało pytań: <strong>' + questionsLeft() + '</strong> (kolejek: <strong>' + roundsLeft() + '</strong>)</div>';	
		msg += roundInfo + questionsInfo;
	} else {
		let overtimeNames = '<div class="info-quiz" id="info-overtime-names">W dogrywce: ';
		const overtimePlayers = Quiz.overtime.playersToBeAsked;
		overtimeNames += overtimePlayers.map((player) => `<strong>${player.name}</strong>`).join(', ')  + '</div>';
		msg += overtimeNames;
	}		
	msg += currentPlayer;
	$('#quiz-info').html(msg);
};

const clearMainPage = () => {
	showEl('#tools-button');
	showEl('.quiz-main-logo');
	showEl('#quizStart');
	hideEl('#getAnswer');
	togglePointButtons(false);
	hideEl('#endQuiz');
	hideEl('#image-container');
	hideEl('#audio-container');
	hideEl('#movie-container');
	hideEl('#question-text');
	hideEl('#cat-text');
	hideEl('#quiz-info');
	hideEl('#cancelAnswer');
};

const showEndQuizButton = () => {
	if (Quiz.overtime) {
		return;
	}
	if (Quiz.canBeFinished) {
		showEl('#endQuiz');
	} else {
		hideEl('#endQuiz');
	}
};

const showCancelButton = () => {
	if (Quiz.overtime) {
		return;
	}
	if (DB.canCancelPoints()) {
		showEl('#cancelAnswer');
	} else {
		hideEl('#cancelAnswer');
	}
};
	
const cancelAnswer = () => {
	if (confirm('Na pewno usunąć ostatnio zdobyty punkt?')) {
		const cancelled = DB.cancelPoints();
		if (cancelled) {
			hideEl('#cancelAnswer');
			showToast('Punkt usunięto.');
		} else {
			showToast('Ostatni punkt został już anulowany.', 'error');
		}
	}
};

const togglePointButtons = (show = true) => {
	if (show) {
		if (typeof Quiz.overtime === 'undefined' || !Quiz.overtime) {
			if (Quiz.settings.buttonHalf) {
				showEl('#buttonHalf');
			}
			if (Quiz.settings.buttonOneHalf) {
				showEl('#buttonOneHalf');
			}
			if (Quiz.settings.buttonTwo) {
				showEl('#buttonTwo');
			}
		}
		showEl('#buttonOne');
		showEl('#notAnswered');
	} else {
		hideEl('#buttonOne');
		hideEl('#buttonHalf');
		hideEl('#buttonTwo');
		hideEl('#buttonOneHalf');
		hideEl('#notAnswered');
	}
};

const getResults = () => {
	const players = DB.fetchAllPlayers();
	const result = players.reduce((acc, player) => {
		acc.push({
			ID: player.ID,
			name: player.name,
			order: player.order,
			points: DB.fetchPlayerPoints(player.ID),
			overtimePoints: DB.fetchPlayerPoints(player.ID, true)
		});
		return acc;
	}, []);
	result.sort((a, b) => {
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

const pointsToPlaces = (results) => {
	const places = [
		[],
		[],
		[],
	];
	let maxPoints = results[0].points;
    let currentPlace = 0;
    results.forEach((result) => {
        if (currentPlace > 2) {
            return;
        }
        if (result.points == maxPoints) {
            places[currentPlace].push(result);
        } else {
            currentPlace += places[currentPlace].length;
            maxPoints = result.points;
            if (currentPlace > 2) {
                return;
            }
            places[currentPlace].push(result);
        }
    });
	return places;
};

const showWinner = (places) => {
	hideEl('#media-container > .quiz-info-line');
	const firstPlace = places[0].pop();
	const secondPlace = places[1].pop();
	const thirdPlace = places[2].pop();
	$('#quiz-info').html('<h2>Zwycięzcą, po bojach i znojach, zostaje:</h2><h1><strong style="color: darkorange;">'
		+ firstPlace.name.toUpperCase() + '</strong></h1><h2>zdobywszy ' + firstPlace.points + ' ' + pointsToWords(firstPlace.points) + '!' + ` <span style="font-size: small;">${formatOvertimePoints(firstPlace.overtimePoints)}</span>`
		+ '</h2><h2>Gratulacje od samego Nicolasa Cage\'a!</h2>'
		+ '<div class="mg-b-10"><img src="res/victory.jpg" /></div>'
		+ '<h4>Miejsce drugie: <strong>' + secondPlace.name + '</strong> (' + secondPlace.points + ' ' + pointsToWords(secondPlace.points) + ')' + ` <span style="font-size: small;">${formatOvertimePoints(secondPlace.overtimePoints)}</span>` + '</h4>'
		+ '<h5>Miejsce trzecie: <strong>' + thirdPlace.name + '</strong> (' + thirdPlace.points + ' ' + pointsToWords(thirdPlace.points) + ')' + ` <span style="font-size: small;">${formatOvertimePoints(thirdPlace.overtimePoints)}</span>` + '</h5>'
	);
	showEl('#quiz-info');
	var mp3 = document.createElement('audio');
	mp3.style.display = 'none';
	mp3.src = 'res/victory.mp3';
	$('#quiz-info').append(mp3);
	mp3.play();
};

const getNextPlayer = () => {
	Quiz.currentPlayerIndex += 1;
	return Quiz.currentPlayerIndex;

};

const startOvertime = (overtime) => {
	DB.startOvertime(overtime);
	Quiz.overtime = overtime;
	displayOvertimeMessage();
	nextTurn();
};

const displayOvertimeMessage = () => {
	let msg = '';
	if (Quiz.overtime.firstPlace.length > 1) {
		msg += '<div style="text-align: center;"><p style="color: black;">O miejsce pierwsze rywalizują: '
			+ Quiz.overtime.firstPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
	}
	if (Quiz.overtime.secondPlace.length > 1) {
		msg += '<div style="text-align: center;"><p style="color: black;">O miejsce drugie rywalizują: '
			+ Quiz.overtime.secondPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
	}
	if (Quiz.overtime.thirdPlace.length > 1) {
		msg += '<div style="text-align: center;"><p style="color: black;">O miejsce trzecie rywalizują: '
			+ Quiz.overtime.thirdPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
	}
	error(msg, 'Dogrywka!');
};

function debug() {
	if (KTron.config.debugMode && console && console.log) {
		console.log.apply(console, arguments);
	}
};
