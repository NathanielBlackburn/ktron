class Settings {

    constructor() {
        if (typeof window.localStorage['ktron_settings'] === 'undefined') {
            window.localStorage['ktron_settings'] = JSON.stringify({});
        }
        if (typeof this.storage['buttonHalf'] === 'undefined') {
            this.buttonHalf = false;
        }
        if (typeof this.storage['buttonOne'] === 'undefined') {
            this.buttonOne = true;
        }
        if (typeof this.storage['buttonOneHalf'] === 'undefined') {
            this.buttonOneHalf = false;
        }
        if (typeof this.storage['buttonTwo'] === 'undefined') {
            this.buttonTwo = false;
        }
        if (typeof this.storage['showPointsAfterEachRound'] === 'undefined') {
            this.showPointsAfterEachRound = false;
        }
    }

    get storage() {
        return JSON.parse(window.localStorage.ktron_settings);
    }

    writeToStorage(key, value) {
        let storage = this.storage;
        storage[key] = value;
        window.localStorage.ktron_settings = JSON.stringify(storage);
    }

    get buttonHalf() {
        return this.storage.buttonHalf;
    }

    set buttonHalf(value) {
        this.writeToStorage('buttonHalf', value);
    }

    get buttonOne() {
        return this.storage.buttonOne;
    }

    set buttonOne(value) {
        this.writeToStorage('buttonOne', value);
    }

    get buttonOneHalf() {
        return this.storage.buttonOneHalf;
    }

    set buttonOneHalf(value) {
        this.writeToStorage('buttonOneHalf', value);
    }

    get buttonTwo() {
        return this.storage.buttonTwo;
    }

    set buttonTwo(value) {
        this.writeToStorage('buttonTwo', value);
    }

    get showPointsAfterEachRound() {
        return this.storage.showPointsAfterEachRound;
    }

    set showPointsAfterEachRound(value) {
        this.writeToStorage('showPointsAfterEachRound', value);
    }
}
