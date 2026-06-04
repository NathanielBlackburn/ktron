export class Player {

	constructor(id, name, order, removed = false) {
		this.ID = id;
		this.name = name;
		this.order = order;
		this.removed = removed;
	}

	stringify() {
		return JSON.stringify({ID: this.ID, name: this.name, order: this.order, removed: this.removed});
	}

	static initFromJSON(json) {
		const obj = JSON.parse(json);
		return new Player(obj.ID, obj.name, obj.order, !!obj.removed);
	}

	equals(player) {
		return this.ID === player.ID
			&& this.name === player.name
			&& this.order === player.order
			&& !!this.removed === !!player.removed;
	}
}
