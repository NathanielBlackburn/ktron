const isButtonVisible = (document, id) => {
	const el = document.getElementById(id);
	return el && !el.classList.contains('d-none');
};

const isAltImageToggleKey = (event) => event?.key === 't';

export const handleShownImageAltKey = (event, { isGameInProgress, view, showAlt }) => {
	if (!isAltImageToggleKey(event) || !isGameInProgress()) {
		return false;
	}
	view.setShownImageAlt(showAlt);
	return true;
};

export const isQuizInputBlockedByOverlay = (document, view, event) => {
	if (view.isThemedRoundAnnouncementVisible(document)) {
		return !isAltImageToggleKey(event);
	}
	return view.isCinemaLightsOut(document);
};

export const handleOverlayDismissKeyup = (event, { document, view }) => {
	if (event.code !== 'Escape') {
		return false;
	}
	if (view.isThemedRoundAnnouncementVisible(document)) {
		view.dismissThemedRoundAnnouncement(document);
		return true;
	}
	if (view.isCinemaLightsOut(document)) {
		view.lightSwitch(document);
		return true;
	}
	return false;
};

export const handleQuizKeyup = (event, { document, isGameInProgress, actions, view }) => {
	if (event.target.matches('input, textarea, select')) {
		return false;
	}
	if (view && isQuizInputBlockedByOverlay(document, view, event)) {
		return false;
	}
	if (!isGameInProgress() || !actions) {
		return false;
	}

	const key = event.key.toLowerCase();
	if ((key === 'a' || key === 'o') && isButtonVisible(document, 'getAnswer')) {
		actions.questionAnswered();
		return true;
	}
	if (isButtonVisible(document, 'notAnswered')) {
		if (key === '0') {
			actions.answeredIncorrectly();
			return true;
		}
		if (key === '1' && isButtonVisible(document, 'buttonOne')) {
			actions.answeredCorrectly(1);
			return true;
		}
		if (key === 'h' && isButtonVisible(document, 'buttonHalf')) {
			actions.answeredCorrectly(0.5);
			return true;
		}
		if (key === 'f' && isButtonVisible(document, 'buttonOneHalf')) {
			actions.answeredCorrectly(1.5);
			return true;
		}
		if (key === '2' && isButtonVisible(document, 'buttonTwo')) {
			actions.answeredCorrectly(2);
			return true;
		}
	}
	return false;
};
