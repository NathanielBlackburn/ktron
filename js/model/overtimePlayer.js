import { Player } from './player.js';

export class OvertimePlayer extends Player {

	constructor(player, status = 'pending') {
		const base = player instanceof Player
			? player
			: Player.fromRow(player);
		super(base.ID, base.name, base.order, base.isRemoved);
		this.status = status;
	}

	serialize() {
		return JSON.stringify({player: super.serialize(), status: this.status});
	}

	static hydrate(json) {
		const obj = typeof json === 'string' ? JSON.parse(json) : json;
		return new OvertimePlayer(Player.hydrate(obj.player), obj.status);
	}

	equals(overtimePlayer) {
		return super.equals(overtimePlayer)
			&& this.status === overtimePlayer.status;
	}
}
