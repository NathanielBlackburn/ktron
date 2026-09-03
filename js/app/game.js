import '../core/setupGlobals.js';
import { OvertimeRepository } from '../model/overtimeRepository.js';
import { DB } from '../core/db.js';
import { Loader } from '../core/config.js';
import { I18n } from '../core/i18n.js';
import { error, showToast } from '../ui/helpers.js';
import { View } from '../ui/ui.js';
import { QuizmasterPopup } from '../ui/quizmasterPopup.js';
import { QuizEngine } from '../quiz/quizEngine.js';

export const Game = {
	startQuiz() {
		if (!Loader.quizzesReady) {
			showToast(I18n.t('toast.quizzesLoading'), 'warning');
			return;
		}
		if (!jQuery('#players option').length) {
			error(I18n.t('error.noPlayers'));
		} else {
			const quizCode = jQuery('#questions-choice').find(':selected').first().data('quizCode');
			Game.startGameProgress(quizCode);
		}
	},

	checkQuizProgress() {
		const game = DB.fetchUnfinishedGame();
		if (game) {
			Game.restoreGameProgress(game);
		} else {
			View.clearMainPage();
		}
	},

	restoreGameProgress(game) {
		View.showQuizChrome();
		const questionToShow = QuizEngine.restoreGameState(game);
		View.createPointsModal();
		View.showQuestion(questionToShow);
		View.updateQuizInfo();
		View.showEl('#getAnswer');
		View.showEndQuizButton();
		QuizmasterPopup.start();
	},

	startGameProgress(quizCode) {
		View.clearMainPage();
		QuizEngine.initGameState(quizCode);
		View.showQuizChrome();
		View.createPointsModal();
		Game.nextQuestion();
		QuizmasterPopup.start();
	},

	nextQuestion() {
		if (!QuizEngine.overtime && !QuizEngine.resolveCurrentPlayer()) {
			const endOfRoundResult = QuizEngine.handleEndOfRound();
			if (endOfRoundResult == 'endQuiz') {
				Game.endQuiz(true);
				return;
			}
			if (endOfRoundResult == 'newRound' && !QuizEngine.isThemedRound()) {
				showToast(I18n.t('toast.newRound'));
			}
		}
		const result = QuizEngine.pickNextQuestion();
		if (!result) {
			return;
		}
		View.showQuestion(result.question);
		if (result.startRound) {
			DB.startRound(QuizEngine.round);
		}
		if (result.themedRoundToast) {
			View.showThemedRoundAnnouncement(result.themedRoundToast);
		}
		View.updateQuizInfo();
		View.showEl('#getAnswer');
		View.showEndQuizButton();
	},

	questionAnswered() {
		View.hideEl('#getAnswer');
		View.setEndQuizEnabled(false);
		View.togglePointButtons();
		View.showAnswer(QuizEngine.currentQuestion);
		View.lockQuizControls();
	},

	answeredCorrectly(points = 1) {
		View.showPointsAward(points);
		QuizEngine.applyCorrectAnswer(points);
		Game.endTurn();
	},

	answeredIncorrectly() {
		View.showPointsAward(0);
		QuizEngine.applyIncorrectAnswer();
		Game.endTurn();
	},

	endTurn() {
		View.lockQuizControls();
		View.togglePointButtons(false);
		const turnResult = QuizEngine.processEndOfTurn();
		if (turnResult.endQuiz) {
			Game.endQuiz(true, turnResult.endQuizPlaces);
			return;
		}
		if (turnResult.newRoundToast && !QuizEngine.isThemedRound()) {
			showToast(I18n.t('toast.newRound'));
		}
		Game.nextTurn(turnResult.nextRound);
	},

	nextTurn(nextRound = false) {
		View.clearQuestionDisplay();
		Game.nextQuestion();
		if (!QuizEngine.overtime && QuizEngine.settings.showPointsAfterEachRound && nextRound) {
			View.showPointsModal();
		}
	},

	endQuiz(automatic = false, places = null) {
		if (automatic || (confirm(I18n.t('confirm.endGame')) && confirm(I18n.t('confirm.endGameDefinitely')))) {
			View.hideEl('#image-container');
			View.hideEl('#movie-container');
			View.hideEl('#audio-container');
			View.hideEl('#question-text');
			View.hideEl('#cat-text');
			View.hideEl('#cat-image-container');
			View.setEndQuizEnabled(false);
			View.hideEl('#getAnswer');
			View.togglePointButtons(false);

			const outcome = QuizEngine.computeEndGameOutcome(automatic, places);
			if (outcome.showWinner) {
				QuizmasterPopup.stop();
				DB.endQuiz();
				View.showWinner(outcome.showWinner);
				View.updatePointsModal(false);
			} else if (outcome.startOvertime) {
				if (outcome.restoreLastQuestion) {
					QuizEngine.debug('Quiz zakończony ręcznie, przywróć ostatnie pytanie');
					const lastUsedQuestionId = DB.restoreLastQuestion();
					if (lastUsedQuestionId) {
						QuizEngine.questions.filter((question) => question.id == lastUsedQuestionId).forEach((question) => question.used = false);
					}
				}
				Game.startOvertime(outcome.startOvertime);
			}
		}
	},

	removePlayerFromGame(playerId) {
		if (!confirm(I18n.t('confirm.removePlayerFromGame'))) {
			return;
		}
		const result = QuizEngine.removePlayer(playerId);
		if (!result.ok) {
			if (result.reason == 'minPlayers') {
				showToast(I18n.t('toast.minOnePlayer'), 'error');
			} else if (result.reason == 'overtime') {
				showToast(I18n.t('toast.removePlayerInOvertime'), 'error');
			}
			return;
		}
		if (result.endQuiz) {
			View.hidePointsModal();
			Game.endQuiz(true);
			return;
		}
		View.updatePointsModal();
		View.hidePointsModal();
		if (result.needsContinue) {
			View.clearQuestionDisplay();
			Game.nextQuestion();
			View.updateQuizInfo();
		} else {
			View.updateQuizInfo();
		}
	},

	startOvertime(overtime) {
		OvertimeRepository.begin(overtime);
		QuizEngine.overtime = overtime;
		View.displayOvertimeMessage();
		View.updatePointsModal(false);
		Game.nextTurn();
	},
};
