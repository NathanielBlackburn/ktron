export class Player {

	constructor(id, name, order, removed = false) {
		this.ID = id;
		this.name = name;
		this.order = order;
		this.removed = !!removed;
	}

	static fromRow(row) {
		return new Player(row.ID, row.name, row.order, row.removed);
	}

	get isRemoved() {
		return this.removed;
	}

	get isActive() {
		return !this.isRemoved;
	}

	serialize() {
		return JSON.stringify({ID: this.ID, name: this.name, order: this.order, removed: this.removed});
	}

	static hydrate(json) {
		const obj = typeof json === 'string' ? JSON.parse(json) : json;
		return new Player(obj.ID, obj.name, obj.order, !!obj.removed);
	}

	equals(player) {
		return this.ID === player.ID
			&& this.name === player.name
			&& this.order === player.order
			&& this.isRemoved === player.isRemoved;
	}
}
