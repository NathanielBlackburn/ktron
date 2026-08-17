import { settings } from '../model/settings.js';
import { Overtime } from '../model/overtime.js';
import { OvertimeRepository } from '../model/overtimeRepository.js';
import { DB } from '../core/db.js';
import { Loader } from '../core/config.js';
import { I18n } from '../core/i18n.js';

export const QuizEngine = {
	round: 1,
	code: undefined,
	themedRounds: [],

	get settings() {
		return settings;
	},

	get gameInProgress() {
		return typeof this.code !== 'undefined' && this.code !== '';
	},

	get currentPlayer() {
		if (this.overtime) {
			return this.overtime.findNextPlayer();
		}
		return this.resolveCurrentPlayer();
	},

	activePlayers() {
		return (this.players || []).filter((player) => player.isActive);
	},

	activePlayersCount() {
		return this.activePlayers().length;
	},

	resolveCurrentPlayer() {
		if (!this.players) {
			return undefined;
		}
		let idx = this.currentPlayerIndex;
		while (idx < this.players.length && this.players[idx].isRemoved) {
			idx += 1;
		}
		return idx < this.players.length ? this.players[idx] : undefined;
	},

	isFirstTurnOfRound() {
		if (this.overtime) {
			return false;
		}
		const current = this.resolveCurrentPlayer();
		const firstActive = this.activePlayers()[0];
		return current && firstActive && current.ID === firstActive.ID;
	},

	canBeFinished(answerButtonVisible) {
		return this.isFirstTurnOfRound() && this.round > 1 && answerButtonVisible;
	},

	ensureActivePlayerIndex() {
		while (this.currentPlayerIndex < this.players.length && this.players[this.currentPlayerIndex].isRemoved) {
			this.currentPlayerIndex += 1;
		}
	},

	/** @returns {'endQuiz' | 'newRound' | false} */
	handleEndOfRound() {
		this.currentPlayerIndex = 0;
		this.ensureActivePlayerIndex();
		if (this.activePlayersCount() === 0 || this.currentPlayerIndex >= this.players.length) {
			return 'endQuiz';
		}
		this.debug('Idziemy do kolejnej rundy');
		this.debug('Zostało pytań: ', this.questionsLeft());
		this.debug('Graczy jest: ', this.activePlayersCount());
		if (this.questionsLeft() < this.activePlayersCount()) {
			this.debug('Za mało pytań w konkursie, wywalamy resztę i spróbujmy skończyć quiz.');
			DB.useUpAllRemainingQuestions(this.questions);
			this.questions.forEach((question) => question.used = true);
			return 'endQuiz';
		}
		this.round += 1;
		if (this.currentPlayerIndex == 0) {
			return 'newRound';
		}
		return false;
	},

	findQuestion(questionId) {
		if (this.questions) {
			return this.questions.find((question) => question.id == questionId);
		}
		return undefined;
	},

	quizHasMcNotes() {
		return (this.questions || []).some((question) => typeof question.mcNotes === 'string' && question.mcNotes.trim() !== '');
	},

	getRandomNumber(topLimit) {
		if (Loader.config.dontRandomize) {
			return 0;
		}
		return Math.floor(Math.random() * topLimit);
	},

	loadThemedRounds(quiz) {
		this.themedRounds = quiz.themedRounds ? [...quiz.themedRounds] : [];
	},

	getThemedRoundConfig(round = this.round) {
		return this.themedRounds.find((themedRound) => themedRound.round === round);
	},

	isThemedRound(round = this.round) {
		return typeof this.getThemedRoundConfig(round) !== 'undefined';
	},

	/**
	 * Categories still reserved for upcoming or current themed rounds.
	 * Once every themed round for a category is past, leftovers re-enter the normal pool.
	 */
	getReservedCategories(round = this.round) {
		return new Set(
			this.themedRounds
				.filter((themedRound) => themedRound.round >= round)
				.map((themedRound) => themedRound.category),
		);
	},

	getEligibleQuestions(unusedQuestions, themedCategory) {
		if (themedCategory) {
			return unusedQuestions.filter((question) => question.category === themedCategory);
		}
		const reservedCategories = this.getReservedCategories();
		return unusedQuestions.filter((question) => {
			if (!question.category) {
				return true;
			}
			return !reservedCategories.has(question.category);
		});
	},

	createFakeQuestion() {
		return {
			id: -1,
			questionText: I18n.t('fakeQuestion.text'),
			questionType: 'pre:question',
			answerText: '',
			answerType: 'pre:answer',
			used: false,
		};
	},

	questionsLeft() {
		return this.questions.filter((q) => !q.used).length;
	},

	roundsLeft() {
		const count = this.activePlayersCount();
		if (count === 0) {
			return 0;
		}
		return Math.floor((this.questionsLeft() + 1 + this.currentPlayerIndex) / count) - 1;
	},

	newQuiz(quizCode) {
		const players = DB.createGame(quizCode);
		this.players = players;
		this.currentPlayerIndex = 0;
	},

	getResults() {
		const players = DB.fetchAllPlayers().filter((player) => player.isActive);
		const result = players.reduce((acc, player) => {
			acc.push({
				ID: player.ID,
				name: player.name,
				order: player.order,
				points: DB.fetchPlayerPoints(player.ID),
				overtimePoints: DB.fetchPlayerPoints(player.ID, true),
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
	},

	pointsToPlaces(results) {
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
	},

	getNextPlayer() {
		do {
			this.currentPlayerIndex += 1;
		} while (this.currentPlayerIndex < this.players.length && this.players[this.currentPlayerIndex].isRemoved);
		return this.currentPlayerIndex;
	},

	/**
	 * @returns {{ question: object, startRound: boolean } | null}
	 */
	pickNextQuestion() {
		const currentPlayer = this.currentPlayer;
		if (!currentPlayer) {
			return null;
		}
		const unusedQuestions = this.questions.filter((q) => !q.used);
		const themedRoundConfig = this.getThemedRoundConfig();
		const eligibleQuestions = this.getEligibleQuestions(
			unusedQuestions,
			themedRoundConfig?.category,
		);
		if (eligibleQuestions.length == 0) {
			const fake = this.createFakeQuestion();
			this.currentQuestion = fake;
			return { question: fake, startRound: false };
		}
		const newQuestion = eligibleQuestions[this.getRandomNumber(eligibleQuestions.length)];
		DB.useUpQuestion(newQuestion, currentPlayer);
		newQuestion.used = true;
		this.currentQuestion = newQuestion;
		const startRound = this.isFirstTurnOfRound();
		const result = {
			question: newQuestion,
			startRound,
		};
		if (startRound && themedRoundConfig) {
			result.themedRoundToast = {
				round: themedRoundConfig.round,
				name: themedRoundConfig.name,
				category: themedRoundConfig.category,
			};
			if (themedRoundConfig.cover) {
				result.themedRoundToast.cover = themedRoundConfig.cover;
			}
		}
		return result;
	},

	applyCorrectAnswer(points = 1) {
		const player = this.currentPlayer;
		if (!this.overtime) {
			DB.addPoints(player, points);
		} else {
			DB.addPoints(player, 1, true);
			this.overtime.markAnswer(player.ID, 'pass');
			OvertimeRepository.save(this.overtime);
		}
	},

	applyIncorrectAnswer() {
		const player = this.currentPlayer;
		if (!this.overtime) {
			DB.addPoints(player, 0);
		} else {
			DB.addPoints(player, 0, true);
			this.overtime.markAnswer(player.ID, 'fail');
			OvertimeRepository.save(this.overtime);
		}
	},

	processEndOfTurn() {
		if (!this.overtime) {
			this.getNextPlayer();
		}
		const nextRound = this.overtime
			? (this.overtime.findNextPlayer() === undefined)
			: (this.currentPlayerIndex == this.players.length);

		if (!nextRound) {
			return { nextRound: false };
		}

		if (this.overtime) {
			this.overtime.endRound();
			OvertimeRepository.save(this.overtime);
			this.debug('Zostało pytań: ', this.questionsLeft());
			this.debug('Graczy jest: ', this.overtime.playersToBeAsked.length);
			if (this.overtime.isPodiumComplete) {
				this.debug('Koniec tury dogrywki, jest podium');
				return { endQuiz: true, endQuizPlaces: this.pointsToPlaces(this.getResults()) };
			}
			if (this.questionsLeft() > 0 && this.questionsLeft() < this.overtime.playersToBeAsked.length) {
				this.debug('Za mało pytań na kolejną rundę dogrywki, wywalamy pozostałe w diabły');
				DB.useUpAllRemainingQuestions(this.questions);
				this.questions.forEach((question) => question.used = true);
			}
			return { nextRound: true };
		}

		const endOfRoundResult = this.handleEndOfRound();
		if (endOfRoundResult == 'endQuiz') {
			return { endQuiz: true };
		}
		return { nextRound: true, newRoundToast: endOfRoundResult == 'newRound' };
	},

	computeEndGameOutcome(automatic, places) {
		if (this.overtime) {
			return { endQuiz: true, showWinner: this.overtime.podium };
		}
		if (!places) {
			places = this.pointsToPlaces(this.getResults());
		}
		const overtime = new Overtime(places);
		if (overtime.isPodiumComplete) {
			this.debug('Quiz skończony, jest podium, kończymy to');
			return { endQuiz: true, showWinner: places };
		}
		this.debug('Quiz skończony, nie ma podium, lecim w dogrywkę');
		return {
			endQuiz: false,
			startOvertime: overtime,
			restoreLastQuestion: !automatic,
		};
	},

	restoreGameState(game) {
		const index = Loader.quizzes.findIndex((quiz) => quiz.code == game.game_code);
		const quiz = Loader.quizzes[index];
		this.questions = quiz.questions;
		this.code = quiz.code;
		this.title = quiz.title;
		this.loadThemedRounds(quiz);
		this.players = DB.fetchAllPlayers();
		const usedQuestions = DB.fetchUsedQuestions();
		this.questions = this.questions.map((question) => {
			question['used'] = usedQuestions.includes(question.id);
			return question;
		});

		let questionToShow;
		if (game.status == 'overtime') {
			const overtime = OvertimeRepository.load();
			this.overtime = overtime;
			const unusedQuestions = this.questions.filter((q) => !q.used);
			if (unusedQuestions.length == 0) {
				questionToShow = this.createFakeQuestion();
			} else {
				questionToShow = this.findQuestion(DB.fetchLastQuestion().id_question);
			}
		} else {
			const lastQuestion = DB.fetchLastQuestion();
			this.currentPlayerIndex = this.players.findIndex((player) => player.ID == lastQuestion.id_player);
			this.ensureActivePlayerIndex();
			this.round = DB.fetchLastRound();
			questionToShow = this.findQuestion(lastQuestion.id_question);
		}
		this.currentQuestion = questionToShow;
		return questionToShow;
	},

	initGameState(quizCode) {
		const quiz = Loader.quizzes.find((q) => q.code == quizCode);
		this.questions = quiz.questions;
		this.code = quizCode;
		this.title = quiz.title;
		this.loadThemedRounds(quiz);
		this.questions.forEach((question) => {
			question.used = false;
		});
		this.newQuiz(quizCode);
	},

	removePlayer(playerId) {
		if (!this.gameInProgress) {
			return { ok: false, reason: 'notInProgress' };
		}
		if (this.overtime) {
			return { ok: false, reason: 'overtime' };
		}
		const player = DB.fetchPlayer(playerId);
		if (!player?.isActive) {
			return { ok: false, reason: 'invalidPlayer' };
		}
		if (this.activePlayersCount() <= 1) {
			return { ok: false, reason: 'minPlayers' };
		}
		const wasCurrentPlayer = this.resolveCurrentPlayer()?.ID === playerId;
		const lastQuestion = DB.fetchLastQuestion();
		const needsRestore = wasCurrentPlayer
			&& lastQuestion
			&& lastQuestion.id_player == playerId
			&& this.currentQuestion
			&& this.currentQuestion.id != -1;
		if (needsRestore) {
			const lastUsedQuestionId = DB.restoreLastQuestion();
			if (lastUsedQuestionId) {
				this.questions.filter((question) => question.id == lastUsedQuestionId).forEach((question) => question.used = false);
			}
		}
		DB.markPlayerRemoved(playerId);
		DB.zeroPlayerPoints(playerId);
		this.players = DB.fetchAllPlayers();

		let needsContinue = false;
		if (wasCurrentPlayer) {
			this.getNextPlayer();
			if (this.currentPlayerIndex >= this.players.length) {
				const endOfRoundResult = this.handleEndOfRound();
				if (endOfRoundResult == 'endQuiz') {
					return { ok: true, wasCurrentPlayer: true, needsContinue: false, endQuiz: true };
				}
			}
			needsContinue = true;
		}

		return { ok: true, wasCurrentPlayer, needsContinue };
	},

	debug() {
		if (Loader.config.debugMode && console && console.log) {
			console.log.apply(console, arguments);
		}
	},
};
