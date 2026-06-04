const OvertimePlayerBase = (typeof module !== 'undefined' && module.exports)
    ? require('./overtimePlayer').OvertimePlayer
    : window.OvertimePlayer;

class Overtime {

    constructor(places) {
        this.firstPlace = Overtime.toOvertimePlayers(places[0]);
        this.secondPlace = Overtime.toOvertimePlayers(places[1]);
        this.thirdPlace = Overtime.toOvertimePlayers(places[2]);
        this.refreshPlayers(true);
    }

    static toOvertimePlayers(players) {
        return (players || [])
            .filter((player) => !Overtime.isPlayerRemoved(player))
            .map((player) => (player instanceof OvertimePlayerBase) ? player : new OvertimePlayerBase(player));
    }

    static isPlayerRemoved(player) {
        const id = player.ID ?? player.player?.ID;
        if (!id || typeof DB === 'undefined') {
            return false;
        }
        return DB.isPlayerRemoved(id);
    }

    static activeInPlace(place) {
        return place.filter((player) => !Overtime.isPlayerRemoved(player));
    }

    countActivePlayers() {
        const ids = new Set();
        Overtime.activeInPlace(this.firstPlace).forEach((player) => ids.add(player.ID));
        Overtime.activeInPlace(this.secondPlace).forEach((player) => ids.add(player.ID));
        Overtime.activeInPlace(this.thirdPlace).forEach((player) => ids.add(player.ID));
        return ids.size;
    }

    get requiredPodiumPlaces() {
        return Math.min(3, Math.max(1, this.countActivePlayers()));
    }

    stringify() {
        return JSON.stringify({
            firstPlace: this.firstPlace.map((player) => player.stringify()),
            secondPlace: this.secondPlace.map((player) => player.stringify()),
            thirdPlace: this.thirdPlace.map((player) => player.stringify())
        });
    }

    findNextPlayer() {
        return this.findPlayer((player) => player.status == 'pending' && !DB.isPlayerRemoved(player.ID));
    }

    get playersToBeAsked() {
        return this.firstPlace.filter((player) => player.status !== 'finished' && !DB.isPlayerRemoved(player.ID))
            .concat(this.secondPlace.filter((player) => player.status !== 'finished' && !DB.isPlayerRemoved(player.ID)))
            .concat(this.thirdPlace.filter((player) => player.status !== 'finished' && !DB.isPlayerRemoved(player.ID)));
    }

    markAnswer(playerId, status) {
        const player = this.findPlayer((player) => player.ID == playerId);
        player.status = status;
    }

    findPlayer(condition) {
        return this.firstPlace.find((player) => condition(player))
            || this.secondPlace.find((player) => condition(player))
            || this.thirdPlace.find((player) => condition(player));
    }

    endRound() {
        const required = this.requiredPodiumPlaces;
        if (required >= 3) {
            const failedThird = this.thirdPlace.filter((player) => player.status == 'fail');
            if (failedThird.length && failedThird.length < this.thirdPlace.length) {
                this.thirdPlace = this.thirdPlace.filter((player) => player.status == 'pass');
            }
        }
        const failedSecond = this.secondPlace.filter((player) => player.status == 'fail');
        const passedSecond = this.secondPlace.filter((player) => player.status != 'fail');
        if (failedSecond.length && failedSecond.length < this.secondPlace.length) {
            if (required >= 3) {
                this.thirdPlace = failedSecond;
            }
            this.secondPlace = passedSecond;
        }
        const failedFirst = this.firstPlace.filter((player) => player.status == 'fail');
        const passedFirst = this.firstPlace.filter((player) => player.status != 'fail');
        if (failedFirst.length > 0 && failedFirst.length < this.firstPlace.length) {
            if (required >= 3 && this.secondPlace.length) {
                this.thirdPlace = this.secondPlace;
            }
            this.secondPlace = failedFirst;
            this.firstPlace = passedFirst;
        }
        if (required >= 3 && this.firstPlace.length + this.secondPlace.length >= 3) {
            this.thirdPlace = [];
        }
        if (this.firstPlace.length >= 3) {
            this.secondPlace = [];
        }
        if (required < 3) {
            this.thirdPlace = [];
        }
        this.refreshPlayers();
    }

    refreshPlayers(keepCurrentStatus = false) {
        this.firstPlace = this.firstPlace.map((player) => {
            player.status = (this.firstPlace.length == 1) ? 'finished' : (keepCurrentStatus ? player.status : 'pending');
            return player;
        });
        this.secondPlace = this.secondPlace.map((player) => {
            player.status = (this.secondPlace.length == 1) ? 'finished' : (keepCurrentStatus ? player.status : 'pending')
            return player;
        });
        this.thirdPlace = this.thirdPlace.map((player) => {
            player.status =  (this.thirdPlace.length == 1) ? 'finished' : (keepCurrentStatus ? player.status : 'pending')
            return player;
        });
    }

    placeHasSingleActive(place) {
        return Overtime.activeInPlace(place).length === 1;
    }

    get isPodiumComplete() {
        const required = this.requiredPodiumPlaces;
        if (required >= 1 && !this.placeHasSingleActive(this.firstPlace)) {
            return false;
        }
        if (required >= 2 && !this.placeHasSingleActive(this.secondPlace)) {
            return false;
        }
        if (required >= 3 && !this.placeHasSingleActive(this.thirdPlace)) {
            return false;
        }
        return this.playersToBeAsked.length === 0;
    }

    get podium() {
        const toResult = (player) => ({
            ID: player.ID,
            name: player.name,
            order: player.order,
            points: DB.fetchPlayerPoints(player.ID, false),
            overtimePoints: DB.fetchPlayerPoints(player.ID, true),
        });
        const places = [];
        const first = Overtime.activeInPlace(this.firstPlace);
        if (first.length) {
            places.push([toResult(first[0])]);
        }
        if (this.requiredPodiumPlaces >= 2) {
            const second = Overtime.activeInPlace(this.secondPlace);
            if (second.length) {
                places.push([toResult(second[0])]);
            }
        }
        if (this.requiredPodiumPlaces >= 3) {
            const third = Overtime.activeInPlace(this.thirdPlace);
            if (third.length) {
                places.push([toResult(third[0])]);
            }
        }
        return places;
    }

    static initFromJSON(json) {
        const obj = JSON.parse(json);
        return new Overtime(
            [
                obj.firstPlace.map((jsonPlayer) => OvertimePlayerBase.initFromJSON(jsonPlayer)),
                obj.secondPlace.map((jsonPlayer) => OvertimePlayerBase.initFromJSON(jsonPlayer)),
                obj.thirdPlace.map((jsonPlayer) => OvertimePlayerBase.initFromJSON(jsonPlayer)),
            ]
        );
    }

    equals(overtime) {
        return this.firstPlace.length == overtime.firstPlace.length
            && this.secondPlace.length == overtime.secondPlace.length
            && this.thirdPlace.length == overtime.thirdPlace.length
            && this.firstPlace.every((player) => {
                return overtime.firstPlace.some((otherPlayer) => player.equals(otherPlayer));
            })
            && this.secondPlace.every((player) => {
                return overtime.secondPlace.some((otherPlayer) => player.equals(otherPlayer));
            })
            && this.thirdPlace.every((player) => {
                return overtime.thirdPlace.some((otherPlayer) => player.equals(otherPlayer));
            });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Overtime };
} else if (typeof window !== 'undefined') {
    window.Overtime = Overtime;
}
