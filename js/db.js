const db = new localStorageDB('konkursotron', localStorage);

if (!db.tableExists('players'))
	db.createTable('players', ['name']);

if (!db.tableExists('games'))
	db.createTable('games', ['game_code', 'finished']);

if (!db.tableExists('players_games'))
	db.createTable('players_games', ['id_player', 'id_game', 'order']);

if (!db.tableExists('players_chosen'))
	db.createTable('players_chosen', ['id_player']);

if (!db.tableExists('game_rounds'))
	db.createTable('game_rounds', ['id_game', 'round', 'questions', 'answers']);

if (!db.tableExists('points'))
	db.createTable('points', ['id_player', 'points', 'id_game', 'id_question', 'cancelled']);

if (!db.tableExists('overtime'))
	db.createTable('overtime', ['id_game', 'id_player', 'place', 'state', 'order', 'points']);

db.commit();

const Admin = {

	purge: () => {
		db.truncate('games');
		db.truncate('players_games');
		db.truncate('game_rounds');
		db.truncate('points');
		db.truncate('overtime');
		db.commit();		
	},
	
	addPoints: (teamId, points) => {
		var players = db.query('players');
		players = players.filter(function(value) {
			return (typeof value.name != 'undefined' && value.ID == teamId);
		});
		if (players.length && quiz.gameId) {
			db.insert('points', {
				cancelled: null,
				id_game: quiz.gameId,
				id_player: players.pop().ID,
				id_question: Math.floor((Math.random() + 1) * Math.pow(10, 7)),
				points: points
			});
			db.commit();
			return true;
		} else {
			return false;
		}
	},
	
	getPlayerNames: () => {
		var players = db.query('players');
		var playersGame = getPlayers();
		var names = [];
		if (quiz.gameId) {
			players = players.filter(function(value) {
				var found = false;
				for (var i = 0; i < playersGame.length; i++) {
					if (playersGame[i].id_player == value.ID) {
						found = true;
						break;
					}
				}
				return found;
			});
			for (var i = 0; i < players.length; i++) {
				names.push(players[i].ID + ' ' + players[i].name);
			}
		}
		console.log(names.length ? names.join('\n') : false);
	}
}

const Overtime = {

	addOvertimePlayer: (game, player, place, order) => {

		db.insert('overtime', {
			id_game: game,
			id_player: player,
			place: place,
			state: 'ok',
			order: order.toString(),
			points: '0'
		});
		db.commit();

	},

	updateOvertimePlayer: (game, player, change) => {

		db.update('overtime', {id_game: game, id_player: player}, function(row) {
			if (typeof change.place != 'undefined')
				row.place = change.place;
			if (typeof change.state != 'undefined')
				row.state = change.state;
			if (typeof change.points != 'undefined') {
				var currentPoints = parseFloat(row.points);
				row.points = currentPoints + change.points;
			}
			return row;
		});
		db.commit();

	},

	isOvertimeInProgress: (game) => {

		var overtime = db.query('overtime', function(row) {
			if (row.id_game == game && row.state != 'out')
				return true;
			else
				return false;
		});
		return overtime.length > 0;

	},

	getMaxPlayerOrder: (game) => {

		var players = this.getOvertimePlayers();
		if (players.length)
			return parseInt(players.pop().order);
		else
			return 0;

	},

	getOvertimePlayers: (game) => {

		/*var players = db.query('overtime', function(row) {
			if (row.id_game == game && row.state == 'ok')
				return true;
			else
				return false;
		});
		players.sort(function(a, b) {
			if (a.order < b.order)
				return -1;
			else if (a.order == b.order)
				return 0;
			else if (a.order > b.order)
				return 1;
		});*/
		var players = [];
		var places = this.getPlaces(game);
		var buffer = this.getBuffer(game);
		debug(places);
		debug(buffer);
		for (var i = 1; i < 4; i++) {
			if (places[i].length > 1)
				for (var j = 0; j < places[i].length; j++)
					players.push(places[i][j]);
		}
		for (var i = 1; i < 4; i++) {
			if (buffer[i].length > 1)
				for (var j = 0; j < buffer[i].length; j++)
					players.push(buffer[i][j]);
		}
		return players;

	},

	getAllOvertimePlayers: (game) => {

		/*var players = db.query('overtime', function(row) {
			if (row.id_game == game && row.state == 'ok')
				return true;
			else
				return false;
		});
		players.sort(function(a, b) {
			if (a.order < b.order)
				return -1;
			else if (a.order == b.order)
				return 0;
			else if (a.order > b.order)
				return 1;
		});*/
		var players = [];
		var places = this.getPlaces(game);
		var buffer = this.getBuffer(game);
		debug(places);
		debug(buffer);
		for (var i = 1; i < 4; i++) {
			if (places[i].length > 0)
				for (var j = 0; j < places[i].length; j++)
					players.push(places[i][j]);
		}
		for (var i = 1; i < 4; i++) {
			if (buffer[i].length > 0)
				for (var j = 0; j < buffer[i].length; j++)
					players.push(buffer[i][j]);
		}
		return players;

	},

	getPlaces: (game) => {

		var players = db.query('overtime', {
			id_game: game,
			state: 'ok'
		});
		var places = this.constructPlacesTemplate();
		for (var i = 0; i < players.length; i++) {
			places[players[i].place].push(players[i]);
		}
		return places;

	},

	getBuffer: (game) => {

		var players = db.query('overtime', {
			id_game: game,
			state: 'buffer'
		});
		var buffer = this.constructPlacesTemplate();
		for (var i = 0; i < players.length; i++) {
			buffer[players[i].place].push(players[i]);
		}
		return buffer;

	},

	fromBufferToPlaces: (game, buffer, places) => {

		for (var i = 0; i < buffer.length; i++) {
			db.update('overtime', {
				id_game: game,
				id_player: buffer[i].id_player
			}, function(row) {
				row.state = 'ok';
				return row;
			});
		}
		db.commit();

	},

	fromBufferToLowerLevel: (game, buffer, count) => {

		for (var i = 0; i < buffer.length; i++) {
			if (parseInt(buffer[i].place) + count < 4) {
				db.update('overtime', {
					id_game: game,
					id_player: buffer[i].id_player
				}, function(row) {
					row.place = parseInt(buffer[i].place) + count;
					row.state = 'ok';
					return row;
				});
			} else {
				db.update('overtime', {
					id_game: game,
					id_player: buffer[i].id_player
				}, function(row) {
					row.place = 4;
					row.state = 'out';
					return row;
				});
			}
		}
		db.commit();

	},

	constructPlacesTemplate: () => {

		return {
			1: [],
			2: [],
			3: []
		};

	}

};
