import './setupGlobals.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import 'viewerjs/dist/viewer.css';
import '../css/main.css';

import { KTron, UI } from './config.js';
import { DB, Admin } from './db.js';
import { I18n, changeLanguage } from './i18n.js';
import { Quiz } from './quiz.js';
import {
	Page,
	lightSwitch,
	togglePointsModal,
	playerAddShow,
	playerRemove,
	playersPurge,
	playerAdd,
	settingsToggle,
	changeLogo,
	changePointsManually,
} from './common.js';
import {
	startQuiz,
	questionAnswered,
	answeredIncorrectly,
	answeredCorrectly,
	endQuiz,
	removePlayerFromGame,
} from './quiz.js';

Object.assign(window, {
	KTron,
	UI,
	DB,
	Admin,
	I18n,
	Quiz,
	Page,
	lightSwitch,
	togglePointsModal,
	startQuiz,
	questionAnswered,
	answeredIncorrectly,
	answeredCorrectly,
	endQuiz,
	playerAddShow,
	playerRemove,
	playersPurge,
	playerAdd,
	settingsToggle,
	changeLanguage,
	changeLogo,
	changePointsManually,
	removePlayerFromGame,
});
