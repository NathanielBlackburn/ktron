const DB = {

	dBase: new localStorageDB('konkursotron', localStorage),
	version: '3.0',

	Players: 'players',
	Games: 'games',
	Rounds: 'rounds',
	Questions: 'questions',
	Points: 'points',
	Overtime: 'overtime',
	DatabaseVersion: 'database_version',

	createDB: function() {
		this.createTableIfNotExists(this.Players, ['name', 'order']);
		this.createTableIfNotExists(this.Games, ['game_code', 'status']);
		this.createTableIfNotExists(this.Rounds, ['round']);
		this.createTableIfNotExists(this.Questions, ['id_question', 'id_player']);
		this.createTableIfNotExists(this.Points, ['id_player', 'points', 'cancelled', 'overtime']);
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

	update: function() {
		if (!this.dBase.tableExists(this.DatabaseVersion)) {
			this.totalReset(false);
		} else {
			const version = this.dBase.queryAll(this.DatabaseVersion)[0].version;
			if (version != this.version) {
				this.totalReset(false);
			}
		}
	},

	createPlayer: function(name) {
		this.dBase.insert(this.Players, {name: name});
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

	canCancelPoints: function() {
		const pointsEntries = this.dBase.queryAll(this.Points, {sort: [['ID', 'DESC']]});
		return pointsEntries.length && !pointsEntries[0].cancelled && parseFloat(pointsEntries[0].points) > 0;
	},

	cancelPoints: function() {
		if (this.canCancelPoints()) {
			const pointsEntries = this.dBase.queryAll(this.Points, {sort: [['ID', 'DESC']]});
			this.dBase.update(this.Points, {ID: pointsEntries[0].ID}, (row) => {
				row.points = '0';
				row.cancelled = true;
				return row;
			});
			this.dBase.commit();
			return true;
		} else {
			return false;
		}
	},

	endQuiz: function() {
		this.dBase.update(this.Games, {ID: 1}, (row) => {
			row.status = 'finished';
			return row;
		});
		this.dBase.commit();
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
