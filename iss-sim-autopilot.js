// An autopilot platform for the he SPACEX ISS-docking simulator available at
// iss-sim.spacex.com.
//
// See: github.com/aschlosberg/iss-sim-autopilot/README

// numericPrefixOf assumes that the string str has a decimal prefix, which it
// extracts and returns.
function numericPrefixOf(str) {
    const num = str.match(/^(-?\d+\.\d+)/)[1];
    return parseFloat(num);
}

// Angles provides static methods for reading angular errors and rates.
//
// Example usage:
// Angles.errorIn(Angles.roll);
// Angles.rateOf(Angles.pitch);
class Angles {
    static get roll() { return 'roll' }
    static get pitch() { return 'pitch' }
    static get yaw() { return 'yaw' }

    static errorIn(a) {
        return numericPrefixOf($(`#${a}>div.error`).textContent);
    }

    static rateOf(a) {
        return numericPrefixOf($(`#${a}>div.rate`).textContent);
    }
}

// Axes provides a static method for reading the distance from the ISS along an
// axis. If instantiated, an object provides rates of change (similarly to
// Angles) by measuring distance every second.
//
// Example usage:
//
// Axes.distAlong(Axes.x);
// const a = new Axes();
// a.rateOf(Axes.z);
//
// TODO: improve the measurement frequency. Low precision in the distance
// measurement (0.1m) makes this more complicated than simply measuring the
// delta. Proposal: keep the last n measurements and report every 1/n seconds
// based on 1s ago; will also allow a rolling average.
class Axes {
    #last = [];
    #rate = [];
    #intervalID = 0;

    static get x() { return 'x' }
    static get y() { return 'y' }
    static get z() { return 'z' }

    static get all() { return [Axes.x, Axes.y, Axes.z] }
    static indexOf(a) {
        switch (a) {
            case Axes.x: return 0;
            case Axes.y: return 1;
            case Axes.z: return 2;
        };
    }
    
    constructor() {
        this.#rate = Axes.all.map(_ => 0);
        const freqMs = 1000;

        const self = this;
        this.#intervalID = setInterval(() => {
            const curr = Axes.all.map(Axes.distAlong);
            const last = this.#last;
            this.#rate = curr.map((c, i) => {
                const delta = c - last[i];
                return delta / freqMs * 1000;
            });
            this.#last = curr;
        }, freqMs);
    }

    stop() {
        clearInterval(this.#intervalID);
    }

    static distAlong(a) {
        return numericPrefixOf($(`#${a}-range>div.distance`).textContent);
    }

    rateOf(a) {
        return this.#rate[Axes.indexOf(a)];
    }
}

// Controls allow programmatic access to the control interface. Its primary
// method, change(), accepts one of the Axes or Angles.
//
// Example usage:
//
// const c = new Controls();
// c.change(Axes.x, Controls.inc);
// c.change(Angles.pitch, Controls.dec);
class Controls {
    #buttons = null;

    constructor() {
        const angleLabels = {
            'roll': ['left', 'right'],
            'pitch': ['down', 'up'],
            'yaw': ['left', 'right'],
        };
    
        const txLabels = {
            'x': ['backward', 'forward'],
            'y': ['left', 'right'],
            'z': ['down', 'up'],
        };
    
        const toButtons = (labels, buttonID) => {
            return Object.entries(labels).map(keyVal => {
                return [
                    keyVal[0],
                    keyVal[1].map(v => $(buttonID(keyVal[0], v))),
                ];
            });
        };
    
        const angleButtons = toButtons(angleLabels, (k, v) => `#${k}-${v}-button`);
        const txButtons = toButtons(txLabels, (_, v) => `#translate-${v}-button`);
    
        this.#buttons = Object.fromEntries(angleButtons.concat(txButtons));
    }

    static get inc() { return 1 }
    static get dec() { return 0 }

    change(angleOrTranslation, dir) {
        this.#buttons[angleOrTranslation][dir].click();
    }
}

// Autopilot starts here.
(() => {
    console.info('Initiate autopilot');
    // TODO
})();