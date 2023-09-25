var Stats = {

	overallPlayersPoints: function() {

		var points = db.query('points');
		var players = db.query('players');
		var result = [];
		for (var i = 0; i < players.length; i++) {
			result[players[i].ID] = {
				ID: players[i].ID,
				name: players[i].name,
				points: 0
			};
		}
		for (var i = 0; i < points.length; i++) {
			result[points[i].id_player].points += parseFloat(points[i].points);
		}
		result.sort(function(a, b) {
			if (a.points < b.points) {
				return 1;
			} else if (a.points == b.points) {
				if (a.name < b.name)
					return -1;
				else if (a.name > b.name)
					return 1;
				else
					return 0;
			} else if (a.points > b.points) {
				return -1;
			}
		});
		$('#main-stats tbody').empty();
		var lp = 0;
		for (var i = 0; i < result.length; i++) {
			if (typeof result[i] != 'undefined') {
				lp++;
				var currentStats = $('#main-stats tbody').html();
				currentStats += '<tr><td>' + lp
				+ '.</td><td><a href="#" onclick="Stats.playerPointsPrepare(this); return false;" data-player-id="'
				+ result[i].ID + '">' + result[i].name + '</a></td><td>'
				+ result[i].points + '</td></tr>';
				$('#main-stats tbody').html(currentStats);
			}
		}

	},

	playerPointsPrepare: function(node) {

		if ($(node).data('player-id')) {
			var playerId = $(node).data('player-id');
			var points = db.query('points', {id_player: playerId});
			var games = db.query('games');
			var name = $(node).text();
			var gameCodes = {};
			for (var i = 0; i < games.length; i++) {
				games[i].points = 0;
				for (var j = 0; j < questions.length; j++) {
					if (games[i].game_code == questions[j].code) {
						if (typeof gameCodes[questions[j].title] == 'undefined')
							gameCodes[questions[j].title] = 1;
						else
							gameCodes[questions[j].title]++;
						games[i].title = questions[j].title;
						if (gameCodes[questions[j].title] > 1)
							games[i].title += ' (' + gameCodes[questions[j].title] + ')';
					}
				}
			}
			for (var i = 0; i < points.length; i++) {
				for (var j = 0; j < games.length; j++) {
					if (points[i].id_game == games[j].ID)
						games[j].points += parseFloat(points[i].points);
				}
			}
			games.sort(function(a, b) {
				if (a.ID < b.ID)
					return -1;
				else if (a.ID == b.ID)
					return 0;
				else if (a.ID > b.ID)
					return 1;
			});
			if ($('#player-stats').is(':visible')) {
				if (playerId != $('#player-stats').data('player-id'))
					$('#player-stats').slideUp(300, function() {
						Stats.playerPointsDisplay(games, playerId, name);
					});
			} else {
				if ($('#game-stats').is(':visible')) {
					$('#game-stats').slideUp(300, function() {
						Stats.playerPointsDisplay(games, playerId, name);
					});
				} else {
					Stats.playerPointsDisplay(games, playerId, name);
				}
			}
				
		}

	},

	playerPointsDisplay: function(games, playerId, name) {

		$('#player-stats tbody').empty();
		var lp = 0;
		for (var i = 0; i < games.length; i++) {
			if (typeof games[i] != 'undefined') {
				lp++;
				var currentStats = $('#player-stats tbody').html();
				currentStats += '<tr><td>' + lp
				+ '.</td><td><a href="#" onclick="Stats.gamePointsPrepare(this); return false;" data-game-id="'
				+ games[i].ID + '">' + games[i].title + '</a></td><td>'
				+ games[i].points + '</td></tr>';
				$('#player-stats tbody').html(currentStats);
			}
		}
		$('#player-stats-name').text(name);
		$('#player-stats').data('player-id', playerId);
		$('#player-stats').slideDown(300);

	},

	gamePointsPrepare: function(node) {

		var gameId = false;
		if ($(node).data('game-id'))
			gameId = $(node).data('game-id');
		else if (typeof node == 'number')
			gameId = node;
		if (gameId) {
			var points = db.query('points', {id_game: gameId});
			var players = db.query('players');
			var title = $(node).text();
			for (var i = 0; i < players.length; i++) {
				players[i].points = 0;
				for (var j = 0; j < points.length; j++) {
					if (players[i].ID == points[j].id_player)
						players[i].points += parseFloat(points[j].points);
				}
			}
			players.sort(function(a, b) {
				if (a.points < b.points) {
					return 1;
				} else if (a.points == b.points) {
					if (a.name < b.name)
						return 1;
					else if (a.name == b.name)
						return 0;
					else if (a.name > b.name)
						return -1;
				} else if (a.points > b.points) {
					return -1;
				}
			});
			if ($('#game-stats').is(':visible')) {
				if (gameId != $('#game-stats').data('game-id'))
					$('#game-stats').slideUp(300, function() {
						Stats.gamePointsDisplay(players, gameId, title);
					});
			} else {
				if ($('#player-stats').is(':visible')) {
					$('#player-stats').slideUp(300, function() {
						debug(players);
						debug(gameId);
						Stats.gamePointsDisplay(players, gameId, title);
					});
				} else {
					Stats.gamePointsDisplay(players, gameId, title);
				}
			}
		}

	},

	gamePointsDisplay: function(players, gameId, title) {

		$('#game-stats tbody').empty();
		var lp = 0;
		for (var i = 0; i < players.length; i++) {
			if (typeof players[i] != 'undefined') {
				lp++;
				var currentStats = $('#game-stats tbody').html();
				currentStats += '<tr><td>' + lp
				+ '.</td><td><a href="#" onclick="Stats.playerPointsPrepare(this); return false;" data-player-id="'
				+ players[i].ID + '">' + players[i].name + '</a></td><td>'
				+ players[i].points + '</td></tr>';
				$('#game-stats tbody').html(currentStats);
			}
		}
		$('#game-stats-title').text(title);
		$('#game-stats').data('game-id', gameId);
		$('#game-stats').slideDown(300);

	},

	gamePointsModal: function() {

		var players = db.query('players');
		var points = db.query('points', {id_game: quiz.gameId});
		if (points.length == 0)
			return error('Jeszcze nie zdobyto żadnych punktów.', true);
		var overtimePoints = db.query('overtime', {id_game: quiz.gameId});
		var playersGames = db.query('players_games', {id_game: quiz.gameId});
		var playersParticipating = [];
		for (var i = 0; i < players.length; i++) {
			for (var j = 0; j < playersGames.length; j++) {
				if (players[i].ID == playersGames[j].id_player)
					playersParticipating.push(players[i]);
			}
		}
		players = playersParticipating;
		for (var i = 0; i < players.length; i++) {
			players[i].points = 0;
			players[i].overtimePoints = 0;
			for (var j = 0; j < points.length; j++) {
				if (players[i].ID == points[j].id_player)
					players[i].points += parseFloat(points[j].points);
			}
			for (var j = 0; j < overtimePoints.length; j++) {
				if (players[i].ID == overtimePoints[j].id_player)
					players[i].overtimePoints += parseFloat(overtimePoints[j].points);
			}
		}
		players.sort(function(a, b) {
			if (a.points < b.points) {
				return 1;
			} else if (a.points == b.points) {
				if (a.overtimePoints < b.overtimePoints)
					return 1;
				else if (a.overtimePoints == b.overtimePoints)
					return 0;
				else if (a.overtimePoints > b.overtimePoints)
					return -1;
			} else if (a.points > b.points) {
				return -1;
			}
		});
		var lp = 0;
		$('#player-stats-modal tbody').html('');
		for (var i = 0; i < players.length; i++) {
			if (typeof players[i] != 'undefined') {
				lp++;
				var currentStats = $('#player-stats-modal tbody').html();
				currentStats += '<tr><td>' + lp
				+ '.</td><td>' + players[i].name + '</td><td>'
				+ players[i].points;
				if (players[i].overtimePoints > 0)
					currentStats += ' (+' + players[i].overtimePoints + ')';
				currentStats += '</td></tr>';
				$('#player-stats-modal tbody').html(currentStats);
			}
		}
		lightSwitch('#cinema-fade-modal');
		toggleSlide('#player-stats-modal', false);

	},

	getPlayersPointsInGame: function(player, game) {

		pointsWon = 0;
		var points = db.query('points', {id_player: player, id_game: game});
		for (var i = 0; i < points.length; i++)
			pointsWon += parseFloat(points[i].points);
		return pointsWon;

	}

};