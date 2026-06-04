import { UI } from '../config.js';

export class Settings {

	constructor() {
		if (typeof window.localStorage['ktron_settings'] === 'undefined') {
			window.localStorage['ktron_settings'] = JSON.stringify({});
		}
		if (typeof this.storage['buttonHalf'] === 'undefined') {
			this.buttonHalf = false;
		}
		if (typeof this.storage['buttonOne'] === 'undefined') {
			this.buttonOne = true;
		}
		if (typeof this.storage['buttonOneHalf'] === 'undefined') {
			this.buttonOneHalf = false;
		}
		if (typeof this.storage['buttonTwo'] === 'undefined') {
			this.buttonTwo = false;
		}
		if (typeof this.storage['showPointsAfterEachRound'] === 'undefined') {
			this.showPointsAfterEachRound = false;
		}
		if (typeof this.storage['useCustomVictoryImage'] === 'undefined') {
			this.useCustomVictoryImage = false;
		}
		if (typeof this.storage['useCustomVictoryFanfare'] === 'undefined') {
			this.useCustomVictoryFanfare = false;
		}
		if (typeof this.storage['showQuestionAudioOnAnswer'] === 'undefined') {
			this.showQuestionAudioOnAnswer = false;
		}
		if (typeof this.storage['logo'] === 'undefined') {
			this.logo = UI.defaults.LOGO_IMAGE;
		}
		if (typeof this.storage['language'] === 'undefined') {
			this.language = 'pl';
		}
	}

	get storage() {
		return JSON.parse(window.localStorage.ktron_settings);
	}

	writeToStorage(key, value) {
		let storage = this.storage;
		storage[key] = value;
		window.localStorage.ktron_settings = JSON.stringify(storage);
	}

	get buttonHalf() {
		return this.storage.buttonHalf;
	}

	set buttonHalf(value) {
		this.writeToStorage('buttonHalf', value);
	}

	get buttonOne() {
		return this.storage.buttonOne;
	}

	set buttonOne(value) {
		this.writeToStorage('buttonOne', value);
	}

	get buttonOneHalf() {
		return this.storage.buttonOneHalf;
	}

	set buttonOneHalf(value) {
		this.writeToStorage('buttonOneHalf', value);
	}

	get buttonTwo() {
		return this.storage.buttonTwo;
	}

	set buttonTwo(value) {
		this.writeToStorage('buttonTwo', value);
	}

	get showPointsAfterEachRound() {
		return this.storage.showPointsAfterEachRound;
	}

	set showPointsAfterEachRound(value) {
		this.writeToStorage('showPointsAfterEachRound', value);
	}

	get useCustomVictoryImage() {
		return this.storage.useCustomVictoryImage;
	}

	set useCustomVictoryImage(value) {
		this.writeToStorage('useCustomVictoryImage', value);
	}

	get useCustomVictoryFanfare() {
		return this.storage.useCustomVictoryFanfare;
	}

	set useCustomVictoryFanfare(value) {
		this.writeToStorage('useCustomVictoryFanfare', value);
	}

	get showQuestionAudioOnAnswer() {
		return this.storage.showQuestionAudioOnAnswer;
	}

	set showQuestionAudioOnAnswer(value) {
		this.writeToStorage('showQuestionAudioOnAnswer', value);
	}

	get logo() {
		return this.storage.logo;
	}

	set logo(value) {
		this.writeToStorage('logo', value);
	}

	get language() {
		return this.storage.language || 'pl';
	}

	set language(value) {
		this.writeToStorage('language', value);
	}
}

export const settings = new Settings();
