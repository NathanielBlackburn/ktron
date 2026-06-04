const PlayerBase = (typeof module !== 'undefined' && module.exports)
    ? require('./player').Player
    : window.Player;

class OvertimePlayer extends PlayerBase {

    constructor(player, status = 'pending') {
        super(player.ID, player.name, player.order);
        this.status = status;
    }

    stringify() {
        return JSON.stringify({player: super.stringify(), status: this.status});
    }

    static initFromJSON(json) {
        const obj = JSON.parse(json);
        return new OvertimePlayer(PlayerBase.initFromJSON(obj.player), obj.status);
    }

    equals(overtimePlayer) {
        return super.equals(overtimePlayer)
            && this.status === overtimePlayer.status;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OvertimePlayer };
} else if (typeof window !== 'undefined') {
    window.OvertimePlayer = OvertimePlayer;
}
