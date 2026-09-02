const isButtonVisible = (document, id) => {
	const el = document.getElementById(id);
	return el && !el.classList.contains('d-none');
};

export const handleQuizKeyup = (event, { document, isGameInProgress, actions }) => {
	if (event.target.matches('input, textarea, select')) {
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
		if (key === '2' && isButtonVisible(document, 'buttonTwo')) {
			actions.answeredCorrectly(2);
			return true;
		}
	}
	return false;
};
