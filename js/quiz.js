const Quiz = {
	round: 1,
	imageTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pre:question', 'pre:answer'],
	audioTypes: ['mp3', 'm4a'],
	videoTypes: ['mp4'],
	settings: new Settings(),

	get inProgress() {
		return typeof this.code !== 'undefined' && this.code != '';
	},

	get currentPlayer() {
		if (this.overtime) {
			return this.overtime.findNextPlayer();
		}
		return resolveCurrentPlayer();
	},

	get canBeFinished() {
		return isFirstActiveInRound() && this.round > 1 && $('#getAnswer').is(':visible');
	}
};

const isRemoved = (player) => player && !!player.removed;

const activePlayers = () => (Quiz.players || []).filter((player) => !isRemoved(player));

const activePlayersCount = () => activePlayers().length;

const resolveCurrentPlayer = () => {
	if (!Quiz.players) {
		return undefined;
	}
	let idx = Quiz.currentPlayerIndex;
	while (idx < Quiz.players.length && isRemoved(Quiz.players[idx])) {
		idx += 1;
	}
	return idx < Quiz.players.length ? Quiz.players[idx] : undefined;
};

const isFirstActiveInRound = () => {
	if (Quiz.overtime) {
		return false;
	}
	const current = resolveCurrentPlayer();
	const firstActive = activePlayers()[0];
	return current && firstActive && current.ID === firstActive.ID;
};

const ensureActivePlayerIndex = () => {
	while (Quiz.currentPlayerIndex < Quiz.players.length && isRemoved(Quiz.players[Quiz.currentPlayerIndex])) {
		Quiz.currentPlayerIndex += 1;
	}
};

const handleEndOfLap = () => {
	Quiz.currentPlayerIndex = 0;
	ensureActivePlayerIndex();
	if (activePlayersCount() === 0 || Quiz.currentPlayerIndex >= Quiz.players.length) {
		endQuiz(true);
		return true;
	}
	debug('Idziemy do kolejnej rundy');
	debug('Zostało pytań: ', questionsLeft());
	debug('Graczy jest: ', activePlayersCount());
	if (questionsLeft() < activePlayersCount()) {
		debug('Za mało pytań w konkursie, wywalamy resztę i spróbujmy skończyć quiz.');
		DB.useUpAllRemainingQuestions(Quiz.questions);
		Quiz.questions.forEach((question) => question.used = true);
		endQuiz(true);
		return true;
	}
	Quiz.round += 1;
	if (Quiz.currentPlayerIndex == 0) {
		showToast(I18n.t('toast.newRound'));
	}
	return false;
};

const continueAfterRemoval = () => {
	$('#image-container').empty();
	$('#movie-container').empty();
	$('#audio-container').empty();
	$('#question-text').empty();
	hideEl('#image-container');
	hideEl('#movie-container');
	hideEl('#audio-container');
	hideEl('#question-text');
	nextQuestion();
	updateQuizInfo();
};

const startQuiz = () => {
	if (!$('#players option').length) {
		error(I18n.t('error.noPlayers'));
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
	$('#version-info').hide();
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
	createPointsModal();
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
		ensureActivePlayerIndex();
		Quiz.round = DB.fetchLastRound();
		questionToShow = findQuestion(lastQuestion.id_question);
	}
	Quiz.currentQuestion = questionToShow;
	showQuestion(questionToShow);
	updateQuizInfo();
	showEl('#getAnswer');
	showEndQuizButton();
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
	$('#version-info').hide();
	showEl('#quiz-info');
	showEl('#media-container > .quiz-info-line');
	hideEl('#tools-button');
	hideEl('#quizStart');
	showEl('#cinema-light');
	showEl('#show-points');
	createPointsModal();
	nextQuestion();
};

const getRandomNumber = (topLimit) => {
	if (KTron.config.dontRandomize) {
		return 0;
	} else {
		return Math.floor(Math.random() * topLimit);
	}
};

const nextQuestion = () => {
	if (!Quiz.overtime && !resolveCurrentPlayer()) {
		if (handleEndOfLap()) {
			return;
		}
	}
	const currentPlayer = Quiz.currentPlayer;
	if (!currentPlayer) {
		return;
	}
	const unusedQuestions = Quiz.questions.filter(q => !q.used);
	if (unusedQuestions.length == 0) {
		Quiz.currentQuestion = createFakeQuestion();
		showQuestion(Quiz.currentQuestion);
	} else {
		const newQuestion = unusedQuestions[getRandomNumber(unusedQuestions.length)];
		DB.useUpQuestion(newQuestion, currentPlayer);
		newQuestion.used = true;
		Quiz.currentQuestion = newQuestion;
		showQuestion(Quiz.currentQuestion);
	}
	if (isFirstActiveInRound()) {
		DB.startRound(Quiz.round);
	}
	updateQuizInfo();
	showEl('#getAnswer');
	showEndQuizButton();
};

const createFakeQuestion = () => {
	return {
		id: -1,
		questionText: I18n.t('fakeQuestion.text'),
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
	const count = activePlayersCount();
	if (count === 0) {
		return 0;
	}
	return Math.floor((questionsLeft() + 1 + Quiz.currentPlayerIndex) / count) - 1;
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
			if (handleEndOfLap()) {
				return;
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
	if (automatic || (confirm(I18n.t('confirm.endGame')) && confirm(I18n.t('confirm.endGameDefinitely')))) {
		hideEl('#image-container');
		hideEl('#movie-container');
		hideEl('#audio-container');
		hideEl('#question-text');
		hideEl('#cat-text');
		hideEl('#endQuiz');
		hideEl('#getAnswer');
		togglePointButtons(false);
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

const arrayIntersection = (arr1, arr2) => {
	const set1 = new Set(arr1);
	const set2 = new Set(arr2);
	return Array.from(set1.intersection(set2));
};

const showQuestion = (question) => {
	debug('This question: ');
	debug(question);
	debug('---------------------------------------------------');
	clearMediaContainers();
	$('#question-text').empty();
	hideEl('.quiz-main-logo');
	$('#question-text').html(renderTags(question.questionText));
	showEl('#question-text');
	if (typeof question.category !== 'undefined' && question.category.length) {
		$('#cat-text').html(I18n.t('category.prefix') + ' ' + question.category);
		showEl('#cat-text');
	}
	createImageContainer(question, false);
	createAudioContainer(question, false);
	createVideoContainer(question, false);
};

const showAnswer = (question) => {
	clearMediaContainers();
	$('#question-text').empty();
	hideEl('#cat-text');
	$('#cat-text').empty();
	hideEl('.quiz-main-logo');
	if (question.answerText != '') {
		$('#question-text').html(renderTags(question.answerText));
	}
	showEl('#question-text');
	if (Quiz.settings.showQuestionAudioOnAnswer) {
		createAudioContainer(question, false);
	}
	createImageContainer(question, true);
	createAudioContainer(question, true);
	createVideoContainer(question, true);
};

const clearMediaContainers = () => {
	$('#image-container').empty();
	$('#movie-container').empty();
	$('#audio-container').empty();
	hideEl('#image-container');
	hideEl('#movie-container');
	hideEl('#audio-container');
};

const createImageContainer = (question, isAnswer) => {
	const mediaTypes = (isAnswer ? question.answerType : question.questionType).toLowerCase().trim().split('|');
	const intersection = arrayIntersection(Quiz.imageTypes, mediaTypes);
	if (!intersection.length) {
		return;
	}
	const mediaType = intersection[0];
	const quizCode = Quiz.code;
	const image = document.createElement('img');
	image.className = 'question-image';
	let src = '';
	if (mediaType == 'pre:question') {
		src = 'res/pre_q.jpg';
	} else if (mediaType == 'pre:answer') {
		src = 'res/pre_a.jpg';
	} else {
		const lastPart = (isAnswer) ? 'a.' + mediaType : '.' + mediaType;
		src = 'pytania/' + quizCode + '/' + question.id + lastPart;
	}
	image.src = src;
	const imageContainer = $('#image-container');
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

const createVideoContainer = (question, isAnswer) => {
	const mediaTypes = (isAnswer ? question.answerType : question.questionType).toLowerCase().trim().split('|');
	const intersection = arrayIntersection(Quiz.videoTypes, mediaTypes);
	if (!intersection.length) {
		return;
	}
	const mediaType = intersection[0];
	const quizCode = Quiz.code;
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

	const video = document.createElement('video');
	video.setAttribute('id', 'movie-video');
	video.setAttribute('controls', 'controls');
	video.className = 'question-video';
	const lastPart = (isAnswer) ? 'a.' + mediaType : '.' + mediaType;
	video.src = 'pytania/' + quizCode + '/' + question.id + lastPart;
	$(movieContent).append(video);
	showEl(movieContainer);
	if (!isAnswer) {
		$(movieOverlay).css('height', $('#movie-container > video').css('height'));
		$(movieOverlay).on('click', () => {
			hideEl(movieOverlay);
			video.play();
		});
	}
};

const createAudioContainer = (question, isAnswer) => {
	const mediaTypes = (isAnswer ? question.answerType : question.questionType).toLowerCase().trim().split('|');
	const intersection = arrayIntersection(Quiz.audioTypes, mediaTypes);
	if (!intersection.length) {
		return;
	}
	const mediaType = intersection[0];
	const quizCode = Quiz.code;
	const audio = document.createElement('audio');
	audio.setAttribute('controls', 'controls');
	audio.className = 'question-audio';
	const lastPart = (isAnswer) ? 'a.' + mediaType : '.' + mediaType;
	audio.src = 'pytania/' + quizCode + '/' + question.id + lastPart;
	const audioContainer = $('#audio-container');
	audioContainer.append(audio);
	showEl(audioContainer);
};

const escapeHTML = (html) => {
	const escape = document.createElement('textarea');
    escape.textContent = html;
    return escape.innerHTML;
};

const unescapeHTML = (text) => {
	const escape = document.createElement('textarea');
    escape.innerHTML = text;
    return escape.textContent;
};

const renderTags = (text) => {
  const escaped = escapeHTML(text);

  return escaped
    .replace(/\[br\]/g, '<br>')
    .replace(/\[blue\](.*?)\[\/blue\]/g, '<span class="blue">$1</span>');
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
	const player = Quiz.currentPlayer;
	if (player) {
		currentPlayer = '<div class="info-quiz" id="info-quiz-player"><div class="team-name-label">' + I18n.t('quizInfo.answering') + ' </div><div class="team-name">' + player.name + '</div></div>';
	}
	let msg = '<div class="info-quiz" id="info-quiz-name">' + I18n.t('quizInfo.title') + ' <strong>' + Quiz.title + '</strong></div>';
	if (!Quiz.overtime) {
		const roundInfo = '<div class="info-quiz" id="info-quiz-round">' + I18n.t('quizInfo.round') + ' <strong>' + Quiz.round + '</strong></div>';
		const questionsInfo = '<div class="info-quiz" id="info-quiz-questions-left">' + I18n.t('quizInfo.questionsLeft') + ' <strong>' + questionsLeft() + '</strong> (' + I18n.t('quizInfo.roundsLeft') + ' <strong>' + roundsLeft() + '</strong>)</div>';
		msg += roundInfo + questionsInfo;
	} else {
		let overtimeNames = '<div class="info-quiz" id="info-overtime-names">' + I18n.t('quizInfo.overtime') + ' ';
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
	const players = DB.fetchAllPlayers().filter((player) => !player.removed);
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
	const places = [[], [], []];
	if (!results.length) {
		return places;
	}
	const maxPlaces = Math.min(3, results.length);
	let maxPoints = results[0].points;
	let currentPlace = 0;
	results.forEach((result) => {
		if (currentPlace > maxPlaces - 1) {
			return;
		}
		if (result.points == maxPoints) {
			places[currentPlace].push(result);
		} else {
			currentPlace += places[currentPlace].length;
			maxPoints = result.points;
			if (currentPlace > maxPlaces - 1) {
				return;
			}
			places[currentPlace].push(result);
		}
	});
	return places;
};

const showWinner = (places) => {
	hideEl('#media-container > .quiz-info-line');
	const tiers = places.filter((tier) => tier && tier.length);
	const firstPlace = tiers[0][0];
	const victoryImagePath = getVictoryImagePath();
	const victoryFanfarePath = getVictoryFanfarePath();
	const placeLine = (place, label, tag) => {
		return `<${tag}>${label}: <strong>${place.name}</strong> (${place.points} ${pointsToWords(place.points)})` + ` <span style="font-size: small;">${formatOvertimePoints(place.overtimePoints)}</span>` + `</${tag}>`;
	};
	let html = '<h2>' + I18n.t('winner.intro') + '</h2><h1><strong style="color: darkorange;">'
		+ firstPlace.name.toUpperCase() + '</strong></h1><h2>' + I18n.t('winner.scored') + ' ' + firstPlace.points + ' ' + pointsToWords(firstPlace.points) + '!' + ` <span style="font-size: small;">${formatOvertimePoints(firstPlace.overtimePoints)}</span>`
		+ '</h2><h2>' + I18n.t('winner.congrats') + '</h2>'
		+ `<div class="mg-b-10"><img src="${victoryImagePath}" id="victory-image" /></div>`;
	if (tiers[1]) {
		html += placeLine(tiers[1][0], I18n.t('winner.secondPlace'), 'h4');
	}
	if (tiers[2]) {
		html += placeLine(tiers[2][0], I18n.t('winner.thirdPlace'), 'h5');
	}
	$('#quiz-info').html(html);
	const victoryImage = document.getElementById('victory-image');
	victoryImage.onerror = () => {
		victoryImage.onerror = null;
		victoryImage.src = `res/${UI.defaults.VICTORY_IMAGE}.png`;
	};
	victoryImage.onload = () => {
		victoryImage.onload = null;
		victoryImage.onerror = null;
	};
	showEl('#quiz-info');
	const mp3 = document.createElement('audio');
	mp3.style.display = 'none';
	mp3.onerror = () => {
		const defaultMp3 = document.createElement('audio');
		defaultMp3.src = `res/${UI.defaults.VICTORY_FANFARE}.mp3`;
		$('#quiz-info').append(defaultMp3);
		defaultMp3.play();
	};
	mp3.src = victoryFanfarePath;
	$('#quiz-info').append(mp3);
	mp3.play();
};

const getVictoryImagePath = () => {
	if (Quiz.settings.useCustomVictoryImage) {
		return `res/custom/victory.png`;
	} else {
		return `res/${UI.defaults.VICTORY_IMAGE}.png`;
	}
};

const getVictoryFanfarePath = () => {
	if (Quiz.settings.useCustomVictoryFanfare) {
		return `res/custom/fanfare.mp3`;
	} else {
		return `res/${UI.defaults.VICTORY_FANFARE}.mp3`;
	}
};

const getNextPlayer = () => {
	do {
		Quiz.currentPlayerIndex += 1;
	} while (Quiz.currentPlayerIndex < Quiz.players.length && isRemoved(Quiz.players[Quiz.currentPlayerIndex]));
	return Quiz.currentPlayerIndex;
};

const removePlayerFromGame = (playerId) => {
	if (!Quiz.inProgress) {
		return;
	}
	if (!confirm(I18n.t('confirm.removePlayerFromGame'))) {
		return;
	}
	const player = DB.fetchPlayer(playerId);
	if (!player || player.removed) {
		return;
	}
	if (activePlayersCount() <= 1) {
		showToast(I18n.t('toast.minOnePlayer'), 'error');
		return;
	}
	const wasCurrentPlayer = Quiz.overtime
		? (Quiz.overtime.findNextPlayer()?.ID === playerId)
		: (resolveCurrentPlayer()?.ID === playerId);
	const lastQuestion = DB.fetchLastQuestion();
	const needsRestore = wasCurrentPlayer
		&& lastQuestion
		&& lastQuestion.id_player == playerId
		&& Quiz.currentQuestion
		&& Quiz.currentQuestion.id != -1;
	if (needsRestore) {
		const lastUsedQuestionId = DB.restoreLastQuestion();
		if (lastUsedQuestionId) {
			Quiz.questions.filter((question) => question.id == lastUsedQuestionId).forEach((question) => question.used = false);
		}
	}
	DB.markPlayerRemoved(playerId);
	DB.zeroPlayerPoints(playerId);
	Quiz.players = DB.fetchAllPlayers();
	if (Quiz.overtime) {
		const overtimePlayer = Quiz.overtime.findPlayer((p) => p.ID == playerId);
		if (overtimePlayer) {
			overtimePlayer.status = 'finished';
			DB.saveOvertime(Quiz.overtime);
		}
	}
	updatePointsModal();
	hidePointsModal();
	if (wasCurrentPlayer) {
		if (!Quiz.overtime) {
			getNextPlayer();
			if (Quiz.currentPlayerIndex >= Quiz.players.length) {
				if (handleEndOfLap()) {
					return;
				}
			}
		}
		continueAfterRemoval();
	} else {
		updateQuizInfo();
	}
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
		msg += '<div style="text-align: center;"><p style="color: black;">' + I18n.t('overtime.forFirst') + ' '
			+ Quiz.overtime.firstPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
	}
	if (Quiz.overtime.secondPlace.length > 1) {
		msg += '<div style="text-align: center;"><p style="color: black;">' + I18n.t('overtime.forSecond') + ' '
			+ Quiz.overtime.secondPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
	}
	if (Quiz.overtime.thirdPlace.length > 1) {
		msg += '<div style="text-align: center;"><p style="color: black;">' + I18n.t('overtime.forThird') + ' '
			+ Quiz.overtime.thirdPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
	}
	error(msg, I18n.t('overtime.title'));
};

function debug() {
	if (KTron.config.debugMode && console && console.log) {
		console.log.apply(console, arguments);
	}
};
