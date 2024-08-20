// Uncomment for testing
// const Player = require('./player').Player;

class OvertimePlayer extends Player {

    constructor(player, status = 'pending') {
        super(player.ID, player.name, player.order);
        this.status = status;
    }

    stringify() {
        return JSON.stringify({player: super.stringify(), status: this.status});
    }

    static initFromJSON(json) {
        const obj = JSON.parse(json);
        return new OvertimePlayer(Player.initFromJSON(obj.player), obj.status);
    }

    equals(overtimePlayer) {
        return super.equals(overtimePlayer)
            && this.status === overtimePlayer.status;
    }
}

// Uncomment for testing
// module.exports = { OvertimePlayer };
