import '../core/setupGlobals.js';
import { bootstrap, Viewer } from '../core/setupGlobals.js';
import { Loader } from '../core/config.js';
import { DB } from '../core/db.js';
import { settings, resolveSelectedQuiz } from '../model/settings.js';
import { I18n } from '../core/i18n.js';
import { error, formatOvertimePoints, showToast, pointsToWords } from './helpers.js';
import { arrayIntersection, renderTags } from '../core/util.js';
import { Assets } from '../core/assets.js';
import { QuizEngine } from '../quiz/quizEngine.js';
import { McNotesPopup } from './mcNotesPopup.js';

const getMainCarousel = () => {
	const el = document.getElementById('main');
	if (!el) {
		return null;
	}
	return bootstrap.Carousel.getOrCreateInstance(el, { interval: false });
};

const comparePointsModalRows = (a, b) => {
	const removedA = a.classList.contains('player-removed');
	const removedB = b.classList.contains('player-removed');
	if (removedA !== removedB) {
		return removedA ? 1 : -1;
	}
	const pointsA = +a.querySelector('span[data-role="points"]').textContent;
	const pointsB = +b.querySelector('span[data-role="points"]').textContent;
	const overtimeA = +a.querySelector('span[data-role="overtime"]').textContent.replace(/[+()]/g, '');
	const overtimeB = +b.querySelector('span[data-role="overtime"]').textContent.replace(/[+()]/g, '');
	if (pointsA == pointsB) {
		return overtimeB - overtimeA;
	}
	return pointsB - pointsA;
};

const canRemovePlayersFromGame = () => {
	return QuizEngine.gameInProgress && !QuizEngine.overtime && DB.canChangePoints;
};

export const View = {
	toolsPanelIndex: 1,

	showMainCarouselPanel(panelIndex = 0) {
		getMainCarousel()?.to(panelIndex);
		if (panelIndex != 0) {
			this.toolsPanelIndex = panelIndex;
		}
	},

	showQuizPanel() {
		this.showMainCarouselPanel(0);
	},

	openToolsPanel() {
		this.showMainCarouselPanel(this.toolsPanelIndex);
	},

	toggleSlide(element, noClose, speed) {
		if (typeof speed == 'undefined') {
			speed = 300;
		}
		if (typeof noClose == 'undefined') {
			noClose = true;
		}
		if (jQuery(element).is(':hidden')) {
			jQuery(element).slideDown(speed);
		} else if (!noClose) {
			jQuery(element).slideUp(speed);
		}
	},

	isVisible(el) {
		return !el.hasClass('d-none');
	},

	isDisabled(element) {
		return jQuery(element).hasClass('disabled');
	},

	showEl(selector) {
		const element = (selector.constructor == jQuery().constructor) ? selector : jQuery(selector);
		element.removeClass('d-none');
		McNotesPopup.syncControls();
	},

	hideEl(selector) {
		const element = (selector.constructor == jQuery().constructor) ? selector : jQuery(selector);
		element.addClass('d-none');
		McNotesPopup.syncControls();
	},

	fillDataNodes(node) {
		switch (node) {
			case 'players': {
				const list = jQuery('#players');
				jQuery(list).empty();
				const players = DB.fetchAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
				players.forEach((player) => {
					const option = document.createElement('option');
					option.appendChild(document.createTextNode(player.name));
					jQuery(option).data('playerId', player.ID);
					list.append(option);
				});
				break;
			}
			case 'questions': {
				if (!Loader.quizzes.length) {
					return;
				}
				const selectedQuiz = resolveSelectedQuiz(Loader.quizzes);
				const list = jQuery('#quiz-list');
				jQuery(list).empty();
				Loader.quizzes.forEach((quiz) => {
					const option = document.createElement('option');
					option.appendChild(document.createTextNode(quiz.title));
					jQuery(option).data('quizCode', quiz.code);
					if (quiz.code == selectedQuiz.code) {
						option.selected = true;
					}
					list.append(option);
				});
				View.updateQuestionsDescription(selectedQuiz);
				jQuery(list).off('change');
				jQuery(list).on('change', (event) => {
					const code = jQuery(event.target).find(':selected').first().data('quizCode');
					settings.selectedQuizCode = code;
					View.updateQuestionsDescription(Loader.quizzes.find((quiz) => (quiz.code == code)));
				});
				break;
			}
		}
	},

	updateQuestionsDescription(quiz) {
		jQuery('#question-set-title').html('<strong>' + I18n.t('quiz.titleLabel') + ' </strong>  <span class="content">' + quiz.title + '</span>');
		jQuery('#question-set-author').html('<strong>' + I18n.t('quiz.authorLabel') + ' </strong>  <span class="content">' + quiz.author + '</span>');
		jQuery('#question-set-count').html('<strong>' + I18n.t('quiz.questionsCountLabel') + ' </strong>  <span class="content">' + quiz.questions.length + '</span>');
	},

	createPointsModal() {
		const players = DB.fetchAllPlayers();
		const tbody = jQuery('#points-modal-tbody');
		jQuery(tbody).empty();
		players.forEach((player) => {
			const removeButton = canRemovePlayersFromGame() && player.isActive
				? `<button type="button" class="btn btn-tiny btn-outline-secondary ms-1" data-role="remove-player" onclick="KTron.Game.removePlayerFromGame(${player.ID})" aria-label="${I18n.t('player.removeAria')}">×</button>`
				: '';
			let currentStats = tbody.html();
			currentStats += `<tr data-player-id="${player.ID}"><td data-role="lp"></td><td data-role="name-cell"><span data-role="player-name">${player.name}</span>${removeButton}</td><td><button class="btn btn-tiny btn-danger inline" data-role="points-change" onclick="KTron.App.changePointsManually(${player.ID}, false)">-</button><span style="display: inline-block; width: 50px; text-align: center;"><span data-role="points"></span> <span data-role="overtime" style="font-size: small"></span></span><button class="btn btn-tiny btn-primary inline" data-role="points-change" onclick="KTron.App.changePointsManually(${player.ID}, true)">+</button></td></tr>`;
			tbody.html(currentStats);
		});
	},

	hidePointsModal() {
		if (jQuery('#points-modal').hasClass('show')) {
			const modal = bootstrap.Modal.getInstance('#points-modal');
			if (modal) {
				modal.hide();
			}
		}
	},

	togglePointsModal() {
		if (jQuery('#points-modal').hasClass('show')) {
			View.hidePointsModal();
		} else {
			View.showPointsModal();
		}
	},

	showPointsModal() {
		View.updatePointsModal();
		if (!DB.canChangePoints) {
			jQuery('button[data-role="points-change"]').hide();
		}
		if (canRemovePlayersFromGame()) {
			jQuery('#points-modal button[data-role="remove-player"]').show();
		} else {
			jQuery('#points-modal button[data-role="remove-player"]').hide();
		}
		const myModal = new bootstrap.Modal('#points-modal');
		myModal.toggle();
	},

	updatePointsModal(sort = true) {
		const players = DB.fetchAllPlayers();
		players.forEach((player) => {
			player['points'] = player.isRemoved ? 0 : DB.fetchPlayerPoints(player.ID, false);
			player['overtimePoints'] = player.isRemoved ? 0 : DB.fetchPlayerPoints(player.ID, true);
		});
		const tbody = document.querySelector('#points-modal-tbody');
		players.forEach((player) => {
			const row = tbody.querySelector(`tr[data-player-id="${player.ID}"]`);
			row.classList.toggle('player-removed', player.isRemoved);
			const pointsSpan = row.querySelector('span[data-role="points"]');
			pointsSpan.textContent = player.isRemoved ? 0 : player.points;
			const overtimeSpan = row.querySelector('span[data-role="overtime"]');
			overtimeSpan.textContent = player.isRemoved ? '' : formatOvertimePoints(player.overtimePoints);
			row.querySelectorAll('[data-role="remove-player"], [data-role="points-change"]').forEach((el) => {
				const canChange = !player.isRemoved && (el.dataset.role !== 'remove-player' || canRemovePlayersFromGame());
				el.style.display = canChange ? '' : 'none';
			});
		});
		if (sort) {
			View.reorderWithNoAnimation();
		}
	},

	animateReorder() {
		const tbody = document.getElementById('points-modal-tbody');
		const first = new Map();
		[...tbody.children].forEach((el) => {
			first.set(el, el.getBoundingClientRect());
		});

		const rows = [...tbody.children].sort(comparePointsModalRows);
		rows.forEach((r) => tbody.appendChild(r));
		[...tbody.children].forEach((el, index) => {
			el.querySelector('td[data-role="lp"]').textContent = index + 1;
		});

		[...tbody.children].forEach((el) => {
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
					ease: 'power2.out',
				},
			);
		});
	},

	reorderWithNoAnimation() {
		const tbody = document.getElementById('points-modal-tbody');
		const rows = [...tbody.children].sort(comparePointsModalRows);
		rows.forEach((r) => tbody.appendChild(r));
		[...tbody.children].forEach((el, index) => {
			el.querySelector('td[data-role="lp"]').textContent = index + 1;
		});
	},

	playerAddShow() {
		View.toggleSlide('#player-add');
		jQuery('#player-add-name').trigger('focus');
	},

	lightSwitch() {
		if (jQuery('#cinema-fade').is(':hidden')) {
			jQuery('#cinema-fade').fadeIn(300);
			jQuery('#cinema-light i').removeClass('bi-lightbulb-fill').addClass('bi-lightbulb-off-fill');
			jQuery('#cinema-light').removeClass('btn-dark').addClass('btn-light');
		} else {
			jQuery('#cinema-fade').fadeOut(300);
			jQuery('#cinema-light i').removeClass('bi-lightbulb-off-fill').addClass('bi-lightbulb-fill');
			jQuery('#cinema-light').removeClass('btn-light').addClass('btn-dark');
		}
	},

	clearThemedRoundCover() {
		const coverImg = document.getElementById('themed-round-announcement-cover');
		const coverVideo = document.getElementById('themed-round-announcement-cover-video');
		if (coverImg) {
			coverImg.removeAttribute('src');
			delete coverImg.dataset.originalSrc;
			coverImg.removeAttribute('alt');
			coverImg.classList.add('hidden');
		}
		if (coverVideo) {
			coverVideo.pause();
			coverVideo.removeAttribute('src');
			coverVideo.load();
			coverVideo.classList.add('hidden');
		}
	},

	setThemedRoundCover(cover, category) {
		this.clearThemedRoundCover();
		if (!cover) {
			return;
		}
		const src = `pytania/${QuizEngine.code}/${cover}`;
		if (Assets.isVideoFileName(cover)) {
			const coverVideo = document.getElementById('themed-round-announcement-cover-video');
			if (coverVideo) {
				coverVideo.src = src;
				coverVideo.classList.remove('hidden');
				coverVideo.play().catch(() => {});
			}
			return;
		}
		const coverImg = document.getElementById('themed-round-announcement-cover');
		if (coverImg) {
			coverImg.src = src;
			coverImg.dataset.originalSrc = src;
			coverImg.alt = category;
			coverImg.classList.remove('hidden');
		}
	},

	showThemedRoundAnnouncement({ round, category, cover }) {
		const container = document.getElementById('themed-round-announcement');
		const overlay = document.getElementById('themed-round-announcement-overlay');
		const content = document.getElementById('themed-round-announcement-content');
		const text = document.getElementById('themed-round-announcement-text');
		if (!container || !overlay || !content || !text) {
			return;
		}
		text.innerHTML = renderTags(I18n.t('toast.themedRound', { category }));
		content.classList.toggle('has-cover', Boolean(cover));
		this.setThemedRoundCover(cover, category);
		const dismiss = () => {
			gsap.killTweensOf([overlay, content]);
			gsap.to([overlay, content], {
				opacity: 0,
				duration: 0.3,
				ease: 'power1.in',
				onComplete: () => {
					container.classList.add('hidden');
					container.setAttribute('aria-hidden', 'true');
					content.classList.remove('has-cover');
					gsap.set([overlay, content], { clearProps: 'all' });
					this.clearThemedRoundCover();
				},
			});
		};
		if (container._themedRoundDismiss) {
			container.removeEventListener('click', container._themedRoundDismiss);
		}
		container._themedRoundDismiss = dismiss;
		container.classList.remove('hidden');
		container.setAttribute('aria-hidden', 'false');
		gsap.killTweensOf([overlay, content]);
		gsap.set(overlay, { opacity: 0 });
		gsap.set(content, { scale: 0, opacity: 1 });
		gsap.timeline({
			onComplete: () => {
				container.addEventListener('click', dismiss, { once: true });
			},
		})
			.to(overlay, { opacity: 1, duration: 0.3, ease: 'power1.out' })
			.to(content, { scale: 1, duration: 0.3, ease: 'back.out(1.7)' }, 0);
	},

	setupSettings() {
		document.querySelector('#settingsHalfPoint').checked = settings.buttonHalf;
		document.querySelector('#settingsOnePoint').checked = settings.buttonOne;
		document.querySelector('#settingsOneHalfPoint').checked = settings.buttonOneHalf;
		document.querySelector('#settingsTwoPoints').checked = settings.buttonTwo;
		document.querySelector('#settingsShowPointsAfterEachRound').checked = settings.showPointsAfterEachRound;
		document.querySelector('#settingsUseCustomVictoryImage').checked = settings.useCustomVictoryImage;
		document.querySelector('#settingsUseCustomVictoryFanfare').checked = settings.useCustomVictoryFanfare;
		document.querySelector('#settingsShowQuestionAudioOnAnswer').checked = settings.showQuestionAudioOnAnswer;
	},

	settingsToggle(target) {
		switch (target.id) {
			case 'settingsHalfPoint':
				settings.buttonHalf = target.checked;
				break;
			case 'settingsOnePoint':
				settings.buttonOne = target.checked;
				break;
			case 'settingsOneHalfPoint':
				settings.buttonOneHalf = target.checked;
				break;
			case 'settingsTwoPoints':
				settings.buttonTwo = target.checked;
				break;
			case 'settingsShowPointsAfterEachRound':
				settings.showPointsAfterEachRound = target.checked;
				break;
			case 'settingsUseCustomVictoryImage':
				settings.useCustomVictoryImage = target.checked;
				break;
			case 'settingsUseCustomVictoryFanfare':
				settings.useCustomVictoryFanfare = target.checked;
				break;
			case 'settingsShowQuestionAudioOnAnswer':
				settings.showQuestionAudioOnAnswer = target.checked;
				break;
		}
	},

	changeLogo(target) {
		settings.logo = target.value;
		View.loadLogo();
	},

	loadLogo() {
		const logo = settings.logo ?? Assets.defaults.LOGO_IMAGE;
		const path = (logo == 'custom') ? `res/custom/logo.png` : `res/logo/${logo}.png`;
		const logoImg = document.getElementById('logo-image');
		logoImg.src = path;
		document.getElementById('logo-list').value = logo;
		logoImg.onerror = () => {
			showToast(I18n.t('toast.logoNotFound'), 'error');
			logoImg.onerror = null;
			logoImg.src = `res/logo/${Assets.defaults.LOGO_IMAGE}.png`;
			document.getElementById('logo-list').value = Assets.defaults.LOGO_IMAGE;
		};
		logoImg.onload = () => {
			logoImg.onload = null;
			logoImg.onerror = null;
		};
	},

	clearQuestionDisplay() {
		jQuery('#image-container').empty();
		jQuery('#movie-container').empty();
		jQuery('#audio-container').empty();
		jQuery('#question-text').empty();
		View.hideEl('#image-container');
		View.hideEl('#movie-container');
		View.hideEl('#audio-container');
		View.hideEl('#question-text');
	},

	clearMediaContainers() {
		jQuery('#image-container').empty();
		jQuery('#movie-container').empty();
		jQuery('#audio-container').empty();
		View.hideEl('#image-container');
		View.hideEl('#movie-container');
		View.hideEl('#audio-container');
	},

	getAltImageSrc(src) {
		const dotIndex = src.lastIndexOf('.');
		if (dotIndex === -1) {
			return src;
		}
		return src.slice(0, dotIndex) + '-alt' + src.slice(dotIndex);
	},

	setImageAlt(selector, showAlt, { skipPre = false } = {}) {
		const img = document.querySelector(selector);
		if (!img || !img.dataset.originalSrc) {
			return;
		}
		if (skipPre && img.dataset.originalSrc.startsWith('res/pre_')) {
			return;
		}
		img.src = showAlt ? this.getAltImageSrc(img.dataset.originalSrc) : img.dataset.originalSrc;
	},

	setShownImageAlt(showAlt) {
		this.setImageAlt('#image-container img.question-image', showAlt, { skipPre: true });
		this.setImageAlt('#themed-round-announcement-cover', showAlt);
	},

	createImageContainer(question, isAnswer) {
		const mediaTypes = (isAnswer ? question.answerType : question.questionType).toLowerCase().trim().split('|');
		const intersection = arrayIntersection(Assets.imageTypes, mediaTypes);
		if (!intersection.length) {
			return;
		}
		const mediaType = intersection[0];
		const quizCode = QuizEngine.code;
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
		image.dataset.originalSrc = src;
		const imageContainer = jQuery('#image-container');
		imageContainer.append(image);
		const viewer = new Viewer(image, {
			navbar: false,
			toolbar: false,
			movable: false,
			viewed() {
				viewer.zoomTo(1);
			},
		});
		View.showEl(imageContainer);
	},

	createVideoContainer(question, isAnswer) {
		const mediaTypes = (isAnswer ? question.answerType : question.questionType).toLowerCase().trim().split('|');
		const intersection = arrayIntersection(Assets.videoTypes, mediaTypes);
		if (!intersection.length) {
			return;
		}
		const mediaType = intersection[0];
		const quizCode = QuizEngine.code;
		const movieContainer = jQuery('#movie-container');
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
		jQuery(movieContent).append(video);
		View.showEl(movieContainer);
		if (!isAnswer) {
			jQuery(movieOverlay).css('height', jQuery('#movie-container > video').css('height'));
			jQuery(movieOverlay).on('click', () => {
				View.hideEl(movieOverlay);
				video.play();
			});
		}
	},

	createAudioContainer(question, isAnswer) {
		const mediaTypes = (isAnswer ? question.answerType : question.questionType).toLowerCase().trim().split('|');
		const intersection = arrayIntersection(Assets.audioTypes, mediaTypes);
		if (!intersection.length) {
			return;
		}
		const mediaType = intersection[0];
		const quizCode = QuizEngine.code;
		const audio = document.createElement('audio');
		audio.setAttribute('controls', 'controls');
		audio.className = 'question-audio';
		const lastPart = (isAnswer) ? 'a.' + mediaType : '.' + mediaType;
		audio.src = 'pytania/' + quizCode + '/' + question.id + lastPart;
		const audioContainer = jQuery('#audio-container');
		audioContainer.append(audio);
		View.showEl(audioContainer);
	},

	showQuestion(question) {
		QuizEngine.debug('This question: ');
		QuizEngine.debug(question);
		QuizEngine.debug('---------------------------------------------------');
		View.clearMediaContainers();
		jQuery('#question-text').empty();
		View.hideEl('.quiz-main-logo');
		jQuery('#question-text').html(renderTags(question.questionText));
		View.showEl('#question-text');
		if (typeof question.category !== 'undefined' && question.category.length) {
			jQuery('#cat-text').html(renderTags(`${I18n.t('category.prefix')} [blue]${question.category}[/blue]`));
			View.showEl('#cat-text');
		}
		View.createImageContainer(question, false);
		View.createAudioContainer(question, false);
		View.createVideoContainer(question, false);
		McNotesPopup.update(question);
	},

	showAnswer(question) {
		View.clearMediaContainers();
		jQuery('#question-text').empty();
		View.hideEl('#cat-text');
		jQuery('#cat-text').empty();
		View.hideEl('.quiz-main-logo');
		if (question.answerText != '') {
			jQuery('#question-text').html(renderTags(question.answerText));
		}
		View.showEl('#question-text');
		if (QuizEngine.settings.showQuestionAudioOnAnswer) {
			View.createAudioContainer(question, false);
		}
		View.createImageContainer(question, true);
		View.createAudioContainer(question, true);
		View.createVideoContainer(question, true);
	},

	updateQuizInfo() {
		let currentPlayer = '';
		const player = QuizEngine.currentPlayer;
		if (player) {
			currentPlayer = '<div class="info-quiz" id="info-quiz-player"><div class="team-name-label">' + I18n.t('quizInfo.answering') + ' </div><div class="team-name">' + player.name + '</div></div>';
		}
		let msg = '<div class="info-quiz" id="info-quiz-name">' + I18n.t('quizInfo.title') + ' <strong>' + QuizEngine.title + '</strong></div>';
		if (!QuizEngine.overtime) {
			const roundInfo = '<div class="info-quiz" id="info-quiz-round">' + I18n.t('quizInfo.round') + ' <strong>' + QuizEngine.round + '</strong></div>';
			const questionsInfo = '<div class="info-quiz" id="info-quiz-questions-left">' + I18n.t('quizInfo.questionsLeft') + ' <strong>' + QuizEngine.questionsLeft() + '</strong> (' + I18n.t('quizInfo.roundsLeft') + ' <strong>' + QuizEngine.roundsLeft() + '</strong>)</div>';
			msg += roundInfo + questionsInfo;
		} else {
			let overtimeNames = '<div class="info-quiz" id="info-overtime-names">' + I18n.t('quizInfo.overtime') + ' ';
			const overtimePlayers = QuizEngine.overtime.playersToBeAsked;
			overtimeNames += overtimePlayers.map((p) => `<strong>${p.name}</strong>`).join(', ') + '</div>';
			msg += overtimeNames;
		}
		msg += currentPlayer;
		jQuery('#quiz-info').html(msg);
	},

	clearMainPage() {
		View.showEl('#tools-button');
		View.showEl('.quiz-main-logo');
		View.showEl('#quizStart');
		View.hideEl('#getAnswer');
		View.togglePointButtons(false);
		View.hideEl('#endQuiz');
		View.hideEl('#image-container');
		View.hideEl('#audio-container');
		View.hideEl('#movie-container');
		View.hideEl('#question-text');
		View.hideEl('#cat-text');
		View.hideEl('#quiz-info');
	},

	showEndQuizButton() {
		if (QuizEngine.overtime) {
			return;
		}
		const answerVisible = jQuery('#getAnswer').is(':visible');
		if (QuizEngine.canBeFinished(answerVisible)) {
			View.showEl('#endQuiz');
		} else {
			View.hideEl('#endQuiz');
		}
	},

	togglePointButtons(show = true) {
		if (show) {
			if (typeof QuizEngine.overtime === 'undefined' || !QuizEngine.overtime) {
				if (QuizEngine.settings.buttonHalf) {
					View.showEl('#buttonHalf');
				}
				if (QuizEngine.settings.buttonOneHalf) {
					View.showEl('#buttonOneHalf');
				}
				if (QuizEngine.settings.buttonTwo) {
					View.showEl('#buttonTwo');
				}
			}
			View.showEl('#buttonOne');
			View.showEl('#notAnswered');
		} else {
			View.hideEl('#buttonOne');
			View.hideEl('#buttonHalf');
			View.hideEl('#buttonTwo');
			View.hideEl('#buttonOneHalf');
			View.hideEl('#notAnswered');
		}
	},

	getVictoryImagePath() {
		if (QuizEngine.settings.useCustomVictoryImage) {
			return `res/custom/victory.png`;
		}
		return `res/${Assets.defaults.VICTORY_IMAGE}.png`;
	},

	getVictoryFanfarePath() {
		if (QuizEngine.settings.useCustomVictoryFanfare) {
			return `res/custom/fanfare.mp3`;
		}
		return `res/${Assets.defaults.VICTORY_FANFARE}.mp3`;
	},

	showWinner(places) {
		View.hideEl('#media-container > .quiz-info-line');
		const tiers = places.filter((tier) => tier && tier.length);
		const firstPlace = tiers[0][0];
		const victoryImagePath = View.getVictoryImagePath();
		const victoryFanfarePath = View.getVictoryFanfarePath();
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
		jQuery('#quiz-info').html(html);
		const victoryImage = document.getElementById('victory-image');
		victoryImage.onerror = () => {
			victoryImage.onerror = null;
			victoryImage.src = `res/${Assets.defaults.VICTORY_IMAGE}.png`;
		};
		victoryImage.onload = () => {
			victoryImage.onload = null;
			victoryImage.onerror = null;
		};
		View.showEl('#quiz-info');
		const mp3 = document.createElement('audio');
		mp3.style.display = 'none';
		mp3.onerror = () => {
			const defaultMp3 = document.createElement('audio');
			defaultMp3.src = `res/${Assets.defaults.VICTORY_FANFARE}.mp3`;
			jQuery('#quiz-info').append(defaultMp3);
			defaultMp3.play();
		};
		mp3.src = victoryFanfarePath;
		jQuery('#quiz-info').append(mp3);
		mp3.play();
	},

	displayOvertimeMessage() {
		let msg = '';
		if (QuizEngine.overtime.firstPlace.length > 1) {
			msg += '<div style="text-align: center;"><p style="color: black;">' + I18n.t('overtime.forFirst') + ' '
				+ QuizEngine.overtime.firstPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
		}
		if (QuizEngine.overtime.secondPlace.length > 1) {
			msg += '<div style="text-align: center;"><p style="color: black;">' + I18n.t('overtime.forSecond') + ' '
				+ QuizEngine.overtime.secondPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
		}
		if (QuizEngine.overtime.thirdPlace.length > 1) {
			msg += '<div style="text-align: center;"><p style="color: black;">' + I18n.t('overtime.forThird') + ' '
				+ QuizEngine.overtime.thirdPlace.map((player) => `<strong>${player.name}</strong>`).join(', ') + '</p></div>';
		}
		error(msg, I18n.t('overtime.title'));
	},

	showQuizChrome() {
		jQuery('#version-info').hide();
		View.showEl('#quiz-info');
		View.showEl('#media-container > .quiz-info-line');
		View.hideEl('#tools-button');
		View.hideEl('#quizStart');
		View.showEl('#cinema-light');
		View.showEl('#show-points');
	},
};
