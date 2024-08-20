class Player {

    constructor(id, name, order) {
        this.ID = id;
        this.name = name;
        this.order = order;
    }

    stringify() {
        return JSON.stringify({ID: this.ID, name: this.name, order: this.order});
    }

    static initFromJSON(json) {
        const obj = JSON.parse(json);
        return new Player(obj.ID, obj.name, obj.order);
    }

    equals(player) {
        return this.ID === player.ID
            && this.name === player.name
            && this.order === player.order;
    }
}

// Uncomment for testing
// module.exports = { Player };
