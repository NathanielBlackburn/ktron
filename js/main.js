import './core/setupGlobals.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import 'viewerjs/dist/viewer.css';
import '../css/main.css';

import { Loader } from './core/config.js';
import { View } from './ui/ui.js';
import { Admin } from './app/admin.js';
import { I18n } from './core/i18n.js';
import { App } from './app/app.js';
import { Game } from './app/game.js';

const publicMethods = (obj, names) =>
	Object.fromEntries(names.map((name) => [name, obj[name].bind(obj)]));

window.KTron = {
	Loader,
	View: publicMethods(View, [
		'lightSwitch',
		'togglePointsModal',
		'openToolsPanel',
		'showQuizPanel',
		'playerAddShow',
		'settingsToggle',
		'changeLogo',
	]),
	Game: publicMethods(Game, [
		'startQuiz',
		'questionAnswered',
		'answeredIncorrectly',
		'answeredCorrectly',
		'endQuiz',
		'removePlayerFromGame',
	]),
	App: publicMethods(App, [
		'playerAdd',
		'playerRemove',
		'playersPurge',
		'changePointsManually',
	]),
	I18n: publicMethods(I18n, ['changeLanguage']),
	Admin,
};

Object.defineProperty(window.KTron, 'quizzes', {
	get: () => Loader.quizzes,
	enumerable: true,
});
