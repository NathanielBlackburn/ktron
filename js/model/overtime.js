// Uncomment for testing
// const OvertimePlayer = require('./overtimePlayer').OvertimePlayer;

class Overtime {

    constructor(places) {
        this.firstPlace = places[0].map((player) => (player instanceof OvertimePlayer) ? player : new OvertimePlayer(player));
        this.secondPlace = places[1].map((player) => (player instanceof OvertimePlayer) ? player : new OvertimePlayer(player));
        this.thirdPlace = places[2].map((player) => (player instanceof OvertimePlayer) ? player : new OvertimePlayer(player));
        this.refreshPlayers(true);
    }

    stringify() {
        return JSON.stringify({
            firstPlace: this.firstPlace.map((player) => player.stringify()),
            secondPlace: this.secondPlace.map((player) => player.stringify()),
            thirdPlace: this.thirdPlace.map((player) => player.stringify())
        });
    }

    findNextPlayer() {
        return this.findPlayer((player) => player.status == 'pending');
    }

    get playersToBeAsked() {
        return this.firstPlace.filter((player) => player.status !== 'finished')
            .concat(this.secondPlace.filter((player) => player.status !== 'finished'))
            .concat(this.thirdPlace.filter((player) => player.status !== 'finished'));
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
        const failedThird = this.thirdPlace.filter((player) => player.status == 'fail');
        if (failedThird.length && failedThird.length < this.thirdPlace.length) {
            this.thirdPlace = this.thirdPlace.filter((player) => player.status == 'pass');
        }
        const failedSecond = this.secondPlace.filter((player) => player.status == 'fail');
        const passedSecond = this.secondPlace.filter((player) => player.status != 'fail');
        if (failedSecond.length && failedSecond.length < this.secondPlace.length) {
            this.thirdPlace = failedSecond;
            this.secondPlace = passedSecond;
        }        
        const failedFirst = this.firstPlace.filter((player) => player.status == 'fail');
        const passedFirst = this.firstPlace.filter((player) => player.status != 'fail');
        if (failedFirst.length > 0 && failedFirst.length < this.firstPlace.length) {
            if (this.secondPlace.length) {
                this.thirdPlace = this.secondPlace;
            }
            this.secondPlace = failedFirst;
            this.firstPlace = passedFirst;
        }
        if (this.firstPlace.length + this.secondPlace.length >= 3) {
            this.thirdPlace = [];
        }
        if (this.firstPlace.length >= 3) {
            this.secondPlace = [];
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

    get isPodiumComplete() {
        return this.firstPlace.length == 1 && this.secondPlace.length == 1 && this.thirdPlace.length == 1;
    }

    get podium() {
        const first = this.firstPlace[0];
        const second = this.secondPlace[0];
        const third = this.thirdPlace[0]; 
        return [
            [{ID: first.ID, name: first.name, order: first.order, points: DB.fetchPlayerPoints(first.ID, false), overtimePoints: DB.fetchPlayerPoints(first.ID, true)}],
            [{ID: second.ID, name: second.name, order: second.order, points: DB.fetchPlayerPoints(second.ID, false), overtimePoints: DB.fetchPlayerPoints(second.ID, true)}],
            [{ID: third.ID, name: third.name, order: third.order, points: DB.fetchPlayerPoints(third.ID, false), overtimePoints: DB.fetchPlayerPoints(third.ID, true)}],
        ];
    }

    static initFromJSON(json) {
        const obj = JSON.parse(json);
        return new Overtime(
            [
                obj.firstPlace.map((jsonPlayer) => OvertimePlayer.initFromJSON(jsonPlayer)),
                obj.secondPlace.map((jsonPlayer) => OvertimePlayer.initFromJSON(jsonPlayer)),
                obj.thirdPlace.map((jsonPlayer) => OvertimePlayer.initFromJSON(jsonPlayer)),
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

// Uncomment for testing
// module.exports = { Overtime };
