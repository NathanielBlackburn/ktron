import localStorageDB from 'localstoragedb/localstoragedb.js';
import { Player } from '../model/player.js';
import { randomizeArray } from './util.js';
import { Assets } from './assets.js';

const tables = {
	players: 'players',
	games: 'games',
	rounds: 'rounds',
	questions: 'questions',
	points: 'points',
	overtime: 'overtime',
	databaseVersion: 'database_version',
	settings: 'settings',
};

let dBase = new localStorageDB('konkursotron', localStorage);
const version = '3.2.0';
const migrationVersions = [
	'3.1.0',
	'3.1.1',
	'3.1.2',
	'3.2.0',
];

function createTableIfNotExists(name, fields) {
	if (!dBase.tableExists(name)) {
		dBase.createTable(name, fields);
	}
}

function rebuildTable(tableName, fields, rows) {
	if (dBase.tableExists(tableName)) {
		dBase.dropTable(tableName);
	}
	dBase.createTable(tableName, fields);
	rows.forEach((row) => {
		const data = {};
		fields.forEach((field) => {
			data[field] = row[field];
		});
		dBase.insert(tableName, data);
	});
}

function addColumns(tableName, newFields, defaultValues) {
	if (!dBase.tableExists(tableName)) {
		return;
	}
	const addedFields = (Array.isArray(newFields) ? newFields : [newFields])
		.filter((field) => !dBase.columnExists(tableName, field));
	if (addedFields.length === 0) {
		return;
	}
	const fields = dBase.tableFields(tableName)
		.filter((field) => field !== 'ID')
		.concat(addedFields);
	const rows = dBase.queryAll(tableName).map((row) => {
		const data = {};
		fields.forEach((field) => {
			if (row[field] !== undefined) {
				data[field] = row[field];
			} else if (addedFields.includes(field)) {
				data[field] = typeof defaultValues === 'object' && defaultValues !== null
					? defaultValues[field]
					: defaultValues;
			}
		});
		return data;
	});
	rebuildTable(tableName, fields, rows);
}

function removeColumns(tableName, columnsToRemove) {
	if (!dBase.tableExists(tableName)) {
		return;
	}
	const removed = Array.isArray(columnsToRemove) ? columnsToRemove : [columnsToRemove];
	const fields = dBase.tableFields(tableName)
		.filter((field) => field !== 'ID' && !removed.includes(field));
	const rows = dBase.queryAll(tableName).map((row) => {
		const data = {};
		fields.forEach((field) => {
			data[field] = row[field];
		});
		return data;
	});
	rebuildTable(tableName, fields, rows);
}

function createDB() {
	createTableIfNotExists(tables.players, ['name', 'order', 'removed']);
	createTableIfNotExists(tables.games, ['game_code', 'status']);
	createTableIfNotExists(tables.rounds, ['round']);
	createTableIfNotExists(tables.questions, ['id_question', 'id_player']);
	createTableIfNotExists(tables.points, ['id_player', 'points', 'overtime']);
	createTableIfNotExists(tables.overtime, ['data']);
	createTableIfNotExists(tables.databaseVersion, ['version']);

	dBase.insert(tables.databaseVersion, {version});
	dBase.commit();
}

function padVersion(versionString) {
	if (versionString.match(/^\d\.\d$/)) {
		return versionString + '.0';
	}
	return versionString;
}

function getDBVersion() {
	return padVersion(dBase.queryAll(tables.databaseVersion)[0].version);
}

function migrateTo312() {
	if (dBase.tableExists(tables.players) && !dBase.columnExists(tables.players, 'removed')) {
		addColumns(tables.players, ['removed'], false);
	}
	if (dBase.tableExists(tables.points) && dBase.columnExists(tables.points, 'cancelled')) {
		const rows = dBase.queryAll(tables.points).map((row) => ({
			id_player: row.id_player,
			points: row.points,
			overtime: row.overtime || false,
		}));
		rebuildTable(tables.points, ['id_player', 'points', 'overtime'], rows);
	}
	dBase.commit();
}

function migrateTo320() {
	try {
		const raw = window.localStorage.getItem('ktron_settings');
		if (!raw) {
			return;
		}
		const storedSettings = JSON.parse(raw);
		if (!storedSettings.logo || storedSettings.logo !== Assets.defaults.LOGO_IMAGE) {
			storedSettings.logo = Assets.defaults.LOGO_IMAGE;
			window.localStorage.setItem('ktron_settings', JSON.stringify(storedSettings));
		}
	} catch {
		// ignore invalid settings payload
	}
}

function migrate(currentVersion) {
	migrationVersions.forEach((migrationVersion) => {
		if (currentVersion >= migrationVersion) {
			return;
		}
		switch (migrationVersion) {
			case '3.1.2':
				migrateTo312();
				break;
			case '3.2.0':
				migrateTo320();
				break;
			default:
		}
		dBase.update(tables.databaseVersion, null, (row) => { row.version = migrationVersion; return row; });
		dBase.commit();
	});
}

function clearRemovedFlags() {
	dBase.update(tables.players, null, (row) => {
		row.removed = false;
		return row;
	});
	dBase.commit();
}

function update() {
	if (!dBase.tableExists(tables.databaseVersion)) {
		DB.totalReset(false);
	} else {
		const currentVersion = getDBVersion();
		if (currentVersion != version) {
			migrate(currentVersion);
		}
	}
}

export const DB = {

	get version() {
		return version;
	},

	createPlayer: function(name) {
		dBase.insert(tables.players, {name: name, removed: false});
		dBase.commit();
	},

	markPlayerRemoved: function(playerId) {
		dBase.update(tables.players, {ID: playerId}, (row) => {
			row.removed = true;
			return row;
		});
		dBase.commit();
	},

	zeroPlayerPoints: function(playerId) {
		const player = {ID: playerId};
		const mainPoints = this.fetchPlayerPoints(playerId, false);
		const overtimePoints = this.fetchPlayerPoints(playerId, true);
		if (mainPoints !== 0) {
			this.addPoints(player, -mainPoints, false);
		}
		if (overtimePoints !== 0) {
			this.addPoints(player, -overtimePoints, true);
		}
	},

	removePlayer: function(playerId) {
		dBase.deleteRows(tables.players, {ID: playerId});
		dBase.commit();
	},

	removeAllPlayers: function() {
		dBase.truncate(tables.players);
		dBase.commit();
	},

	fetchPlayerByName: function(name) {
		const results = dBase.queryAll(tables.players, {query: {name: name}});
		return results.length ? Player.fromRow(results[0]) : null;
	},

	fetchPlayer: function(playerId) {
		const results = dBase.queryAll(tables.players, {query: {ID: playerId}});
		return results.length ? Player.fromRow(results[0]) : null;
	},

	fetchAllPlayers: function() {
		return dBase.queryAll(tables.players, {sort: [['order', 'ASC']]}).map(Player.fromRow);
	},

	createGame: function(quizCode) {
		this.purge(false);
		clearRemovedFlags();
		dBase.insert(tables.games, {game_code: quizCode, status: 'unfinished'});
		const players = randomizeArray(dBase.queryAll(tables.players));
		players.forEach((player, pos) => {
			player.order = pos;
			dBase.update(tables.players, {ID: player.ID}, (row) => {
				row.order = pos;
				return row;
			});
		});
		dBase.commit();
		return players.map(Player.fromRow);
	},

	fetchUnfinishedGame: function() {
		const result = dBase.queryAll(tables.games, {query: (row) => row.status != 'finished'});
		return (result.length) ? result.slice(-1)[0] : null;
	},

	startRound: function(round) {
		dBase.insert(tables.rounds, {round: round});
		dBase.commit();
	},

	fetchLastRound: function() {
		return dBase.queryAll(tables.rounds, {sort: [['round', 'DESC']]})[0].round;
	},

	useUpQuestion: function(question, player) {
		dBase.insert(tables.questions, {id_question: question.id, id_player: player.ID});
		dBase.commit();
	},

	restoreLastQuestion: function() {
		const lastUsedQuestion = this.fetchLastQuestion();
		if (lastUsedQuestion) {
			dBase.deleteRows(tables.questions, {ID: lastUsedQuestion.ID});
			dBase.commit();
		}
		return lastUsedQuestion ? lastUsedQuestion.id_question : null;
	},

	useUpAllRemainingQuestions(questions) {
		questions
			.filter((question) => !question.used)
			.forEach((question) => {
				this.useUpQuestion(question, 0);
			});
	},

	fetchUsedQuestions: function() {
		const questions = dBase.queryAll(tables.questions);
		return (questions.length) ? questions.map((question) => question.id_question) : null;
	},

	fetchLastQuestion: function() {
		const questions = dBase.queryAll(tables.questions, {sort: [['ID', 'ASC']]});
		return (questions.length) ? questions.slice(-1)[0] : null;
	},

	addPoints: function(player, points, overtime = false) {
		dBase.insert(tables.points, {id_player: player.ID, points: points.toString(), overtime: overtime});
		dBase.commit();
	},

	fetchPlayerPoints: function(playerId, overtime = false) {
		const points = dBase.queryAll(tables.points, {query: {id_player: playerId, overtime: overtime}});
		return points.reduce((sum, pointsEntry) => {
			return sum + parseFloat(pointsEntry.points);
		}, 0);
	},

	endQuiz: function() {
		dBase.update(tables.games, {ID: 1}, (row) => {
			row.status = 'finished';
			return row;
		});
		dBase.commit();
	},

	get canChangePoints() {
		const quiz = dBase.queryAll(tables.games, {ID: 1});
		return quiz[0].status == 'unfinished';
	},

	setGameStatus: function(status) {
		dBase.update(tables.games, {ID: 1}, (row) => {
			row.status = status;
			return row;
		});
		dBase.commit();
	},

	saveOvertimeData: function(data) {
		dBase.insertOrUpdate(tables.overtime, {ID: 1}, {data});
		dBase.commit();
	},

	fetchOvertimeData: function() {
		const results = dBase.queryAll(tables.overtime);
		return results.length ? results.at(-1).data : null;
	},

	purge: function(reload = true) {
		dBase.truncate(tables.games);
		dBase.truncate(tables.rounds);
		dBase.truncate(tables.questions);
		dBase.truncate(tables.points);
		dBase.truncate(tables.overtime);
		dBase.commit();
		if (reload) {
			window.location.reload();
		}
	},

	totalReset: function(reload = true) {
		dBase.drop();
		dBase.commit();
		dBase = new localStorageDB('konkursotron', window.localStorage);
		createDB();
		if (reload) {
			window.location.reload();
		}
	}
};

update();
