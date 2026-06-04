const DB = {

	dBase: new localStorageDB('konkursotron', localStorage),
	version: '3.1.2',
	migration_versions: [
		'3.1.0',
		'3.1.1',
		'3.1.2',
	],

	Players: 'players',
	Games: 'games',
	Rounds: 'rounds',
	Questions: 'questions',
	Points: 'points',
	Overtime: 'overtime',
	DatabaseVersion: 'database_version',
	Settings: 'settings',

	createDB: function() {
		this.createTableIfNotExists(this.Players, ['name', 'order', 'removed']);
		this.createTableIfNotExists(this.Games, ['game_code', 'status']);
		this.createTableIfNotExists(this.Rounds, ['round']);
		this.createTableIfNotExists(this.Questions, ['id_question', 'id_player']);
		this.createTableIfNotExists(this.Points, ['id_player', 'points', 'overtime']);
		this.createTableIfNotExists(this.Overtime, ['data']);
		this.createTableIfNotExists(this.DatabaseVersion, ['version']);
		
		this.dBase.insert(this.DatabaseVersion, {version: this.version});
		this.dBase.commit();	
	},

	createTableIfNotExists: function(name, fields) {
		if (!this.dBase.tableExists(name)) {
			this.dBase.createTable(name, fields);
		}
	},

	rebuildTable: function(tableName, fields, rows) {
		if (this.dBase.tableExists(tableName)) {
			this.dBase.dropTable(tableName);
		}
		this.dBase.createTable(tableName, fields);
		rows.forEach((row) => {
			const data = {};
			fields.forEach((field) => {
				data[field] = row[field];
			});
			this.dBase.insert(tableName, data);
		});
	},

	addColumns: function(tableName, newFields, defaultValues) {
		if (!this.dBase.tableExists(tableName)) {
			return;
		}
		const addedFields = (Array.isArray(newFields) ? newFields : [newFields])
			.filter((field) => !this.dBase.columnExists(tableName, field));
		if (addedFields.length === 0) {
			return;
		}
		const fields = this.dBase.tableFields(tableName)
			.filter((field) => field !== 'ID')
			.concat(addedFields);
		const rows = this.dBase.queryAll(tableName).map((row) => {
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
		this.rebuildTable(tableName, fields, rows);
	},

	removeColumns: function(tableName, columnsToRemove) {
		if (!this.dBase.tableExists(tableName)) {
			return;
		}
		const removed = Array.isArray(columnsToRemove) ? columnsToRemove : [columnsToRemove];
		const fields = this.dBase.tableFields(tableName)
			.filter((field) => field !== 'ID' && !removed.includes(field));
		const rows = this.dBase.queryAll(tableName).map((row) => {
			const data = {};
			fields.forEach((field) => {
				data[field] = row[field];
			});
			return data;
		});
		this.rebuildTable(tableName, fields, rows);
	},

	update: function() {
		if (!this.dBase.tableExists(this.DatabaseVersion)) {
			this.totalReset(false);
		} else {
			const currentVersion = this.getDBVersion();
			if (currentVersion != this.version) {
				this.migrate(currentVersion);
			}
		}
	},

	getDBVersion: function () {
		let version = this.dBase.queryAll(this.DatabaseVersion)[0].version;
		if (version.match(/^\d\.\d$/)) {
			version += '.0';
		}
		return version;
	},

	migrate: function(currentVersion) {
		this.migration_versions.forEach((migrationVersion) => {
			if (currentVersion >= migrationVersion) {
				return;
			}
			switch (migrationVersion) {
				case '3.1.2':
					this.migrateTo312();
					break;
				default:
			}
			this.dBase.update(this.DatabaseVersion, null, (row) => { row.version = migrationVersion; return row; });
			this.dBase.commit();
		});
	},

	migrateTo312: function() {
		if (this.dBase.tableExists(this.Players) && !this.dBase.columnExists(this.Players, 'removed')) {
			this.addColumns(this.Players, ['removed'], false);
		}
		if (this.dBase.tableExists(this.Points) && this.dBase.columnExists(this.Points, 'cancelled')) {
			const rows = this.dBase.queryAll(this.Points).map((row) => ({
				id_player: row.id_player,
				points: row.points,
				overtime: row.overtime || false,
			}));
			this.rebuildTable(this.Points, ['id_player', 'points', 'overtime'], rows);
		}
		this.dBase.commit();
	},

	padVersion: function(version) {
		if (version.match(/^\d\.\d$/)) {
			return version += '.0';
		}
		return version;
	},

	getSettings: function() {
		return this.dBase.queryAll(this.Settings, {query: {ID: 1}})[0];
	},

	createPlayer: function(name) {
		this.dBase.insert(this.Players, {name: name, removed: false});
		this.dBase.commit();
	},

	markPlayerRemoved: function(playerId) {
		this.dBase.update(this.Players, {ID: playerId}, (row) => {
			row.removed = true;
			return row;
		});
		this.dBase.commit();
	},

	isPlayerRemoved: function(playerId) {
		const player = this.fetchPlayer(playerId);
		return player ? !!player.removed : false;
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

	clearRemovedFlags: function() {
		this.dBase.update(this.Players, null, (row) => {
			row.removed = false;
			return row;
		});
		this.dBase.commit();
	},

	removePlayer: function(playerId) {
		this.dBase.deleteRows(this.Players, {ID: playerId});
		this.dBase.commit();
	},

	removeAllPlayers: function() {
		this.dBase.truncate(this.Players);
		this.dBase.commit();
	},

	fetchPlayerByName: function(name) {
		const results = this.dBase.queryAll(this.Players, {query: {name: name}});
		return results.length ? results[0] : null;
	},

	fetchPlayer: function(playerId) {
		const results = this.dBase.queryAll(this.Players, {query: {ID: playerId}});
		return results.length ? results[0] : null;
	},

	fetchAllPlayers: function() {
		return this.dBase.queryAll(this.Players, {sort: [['order', 'ASC']]});
	},

	createGame: function(quizCode) {
		this.purge(false);
		this.clearRemovedFlags();
		this.dBase.insert(this.Games, {game_code: quizCode, status: 'unfinished'});
		const players = randomizeArray(this.dBase.queryAll(this.Players));
		players.forEach((player, pos) => {
			player.order = pos;
			this.dBase.update(this.Players, {ID: player.ID}, (row) => {
				row.order = pos;
				return row;
			});
		});
		this.dBase.commit();
		return players;
	},

	fetchUnfinishedGame: function() {
		const result = this.dBase.queryAll(this.Games, {query: (row) => row.status != 'finished'});
		return (result.length) ? result.slice(-1)[0] : null;
	},

	startRound: function(round) {
		this.dBase.insert(this.Rounds, {round: round});
		this.dBase.commit();
	},

	fetchLastRound: function() {
		return this.dBase.queryAll(this.Rounds, {sort: [['round', 'DESC']]})[0].round;
	},

	useUpQuestion: function(question, player) {
		this.dBase.insert(this.Questions, {id_question: question.id, id_player: player.ID});
		this.dBase.commit();
	},

	restoreLastQuestion: function() {
		const lastUsedQuestion = this.fetchLastQuestion();
		if (lastUsedQuestion) {
			this.dBase.deleteRows(this.Questions, {ID: lastUsedQuestion.ID});
			this.dBase.commit();
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
		const questions = this.dBase.queryAll(this.Questions);
		return (questions.length) ? questions.map((question) => question.id_question) : null;
	},

	fetchLastQuestion: function() {
		const questions = this.dBase.queryAll(this.Questions, {sort: [['ID', 'ASC']]});
		return (questions.length) ? questions.slice(-1)[0] : null;
	},

	addPoints: function(player, points, overtime = false) {
		this.dBase.insert(this.Points, {id_player: player.ID, points: points.toString(), overtime: overtime});
		this.dBase.commit();
	},

	fetchAllPoints: function() {
		return this.dBase.queryAll(this.Points);
	},

	fetchPlayerPoints: function(playerId, overtime = false) {
		const points = this.dBase.queryAll(this.Points, {query: {id_player: playerId, overtime: overtime}});
		return points.reduce((sum, pointsEntry) => {
			return sum + parseFloat(pointsEntry.points);
		}, 0);
	},

	endQuiz: function() {
		this.dBase.update(this.Games, {ID: 1}, (row) => {
			row.status = 'finished';
			return row;
		});
		this.dBase.commit();
	},

	get canChangePoints() {
		const quiz = this.dBase.queryAll(this.Games, {ID: 1});
		return quiz[0].status == 'unfinished';
	},

	startOvertime: function(overtime) {
		this.dBase.update(this.Games, {ID: 1}, (row) => {
			row.status = 'overtime';
			return row;
		});
		this.dBase.commit();
		this.saveOvertime(overtime);
	},

	saveOvertime: function(overtime) {
		this.dBase.insertOrUpdate(this.Overtime, {ID: 1}, {data: overtime.stringify()});
		this.dBase.commit();
	},

	fetchOvertime: function() {
		const results = this.dBase.queryAll(this.Overtime);
		return (results.length) ? Overtime.initFromJSON(results.slice(-1)[0].data) : null;
	},

	purge: function(reload = true) {
		this.dBase.truncate(this.Games);
		this.dBase.truncate(this.Rounds);
		this.dBase.truncate(this.Questions);
		this.dBase.truncate(this.Points);
		this.dBase.truncate(this.Overtime);
		this.dBase.commit();
		if (reload) {
			window.location.reload();
		}
	},

	totalReset: function(reload = true) {
		this.dBase.drop();
		this.dBase.commit();
		this.dBase = new localStorageDB('konkursotron', window.localStorage);
		this.createDB();
		if (reload) {
			window.location.reload();
		}
	}
};

DB.update();

const db = DB.dBase;

const Admin = {

	purge: () => {
		DB.purge();
	},

	totalReset: () => {
		DB.totalReset();
	}
}
