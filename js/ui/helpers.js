import '../core/setupGlobals.js';
import { I18n } from '../core/i18n.js';

export const error = (msg, title) => {
	if (typeof title === 'undefined') {
		title = I18n.t('modal.error.title');
	}
	jQuery('#error-modal-title').empty().html(title);
	jQuery('#error-modal-content').empty().html(msg);
	const myModal = new bootstrap.Modal('#error-message');
	myModal.toggle();
};

export const formatOvertimePoints = (points) => {
	return (points > 0) ? `(+${points})` : '';
};

export const formatPointsAwardText = (points) => {
	if (points === 0) {
		return '0';
	}
	return `+${points}`;
};

export const showToast = (text, type = 'info') => {
	const toast = jQuery('#quiz-toast').get(0);
	jQuery('#quiz-toast div.toast-body').text(text);
	jQuery('#quiz-toast div.toast-icon').removeClass(['toast-icon-info', 'toast-icon-warning', 'toast-icon-error']);
	switch (type) {
		case 'warning':
			jQuery('#quiz-toast div.toast-icon').addClass('toast-icon-warning');
			jQuery('#quiz-toast strong.toast-title').text(I18n.t('toast.warning'));
			break;
		case 'error':
			jQuery('#quiz-toast div.toast-icon').addClass('toast-icon-error');
			jQuery('#quiz-toast strong.toast-title').text(I18n.t('toast.error'));
			break;
		default:
			jQuery('#quiz-toast div.toast-icon').addClass('toast-icon-info');
			jQuery('#quiz-toast strong.toast-title').text(I18n.t('toast.info'));
	}
	const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
	toastBootstrap.show();
};

export const pointsToWords = (number) => {
	number = parseFloat(number);
	if (I18n.locale === 'en') {
		return (number === 1) ? I18n.t('points.word_one') : I18n.t('points.word_many');
	}
	if (Math.floor(number) != number) {
		return I18n.t('points.word_fraction');
	} else if (number == 1) {
		return I18n.t('points.word_one');
	} else {
		number = number.toString().slice(-1);
		if (number >= 2 && number <= 4) {
			return I18n.t('points.word_few');
		} else {
			return I18n.t('points.word_many');
		}
	}
};
