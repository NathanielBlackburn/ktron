let i18nReady;

const I18n = {
	locale: 'pl',
	messages: {},

	getStoredLocale() {
		try {
			const storage = JSON.parse(window.localStorage.ktron_settings || '{}');
			return storage.language || 'pl';
		} catch {
			return 'pl';
		}
	},

	init() {
		const locales = window.I18N_LOCALES || {};
		this.locale = this.getStoredLocale();
		this.messages = locales[this.locale];
		if (!this.messages) {
			this.locale = 'pl';
			this.messages = locales.pl || {};
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
	}
};

const changeLanguage = (target) => {
	const language = target.value;
	if (language === I18n.locale) {
		return;
	}
	if (typeof Quiz !== 'undefined' && Quiz.settings) {
		Quiz.settings.language = language;
	} else {
		const storage = JSON.parse(window.localStorage.ktron_settings || '{}');
		storage.language = language;
		window.localStorage.ktron_settings = JSON.stringify(storage);
	}
	location.reload();
};
