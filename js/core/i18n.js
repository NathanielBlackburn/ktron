import pl from '../../locales/pl.js';
import en from '../../locales/en.js';
import szl from '../../locales/szl.js';
import { settings } from '../model/settings.js';

const I18N_LOCALES = { pl, en, szl };

export let i18nReady = null;

export const initI18n = () => {
	i18nReady = I18n.init();
	return i18nReady;
};

export const I18n = {
	locale: 'pl',
	messages: {},

	getStoredLocale() {
		return settings.language;
	},

	init() {
		this.locale = this.getStoredLocale();
		this.messages = I18N_LOCALES[this.locale];
		if (!this.messages) {
			this.locale = 'pl';
			this.messages = I18N_LOCALES.pl || {};
		}
		this.applyToDocument();
		return Promise.resolve();
	},

	t(key, params) {
		let text = this.messages[key];
		if (typeof text === 'undefined') {
			return key;
		}
		if (params) {
			Object.keys(params).forEach((name) => {
				text = text.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), params[name]);
			});
		}
		return text;
	},

	applyToDocument() {
		document.title = this.t('app.title');
		document.querySelectorAll('[data-i18n]').forEach((el) => {
			el.textContent = this.t(el.getAttribute('data-i18n'));
		});
		document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
			el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
		});
		document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
			el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria')));
		});
		const languageList = document.getElementById('language-list');
		if (languageList) {
			languageList.value = this.locale;
		}
	},

	changeLanguage(target) {
		const language = target.value;
		if (language === this.locale) {
			return;
		}
		settings.language = language;
		location.reload();
	},
};
