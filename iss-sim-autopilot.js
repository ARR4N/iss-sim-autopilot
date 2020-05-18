// An autopilot platform for the he SPACEX ISS-docking simulator available at
// iss-sim.spacex.com.
//
// See: github.com/aschlosberg/iss-sim-autopilot/README
//
// Usage: copy and paste everything up to, but excluding, the Autopilot class
// into the console. This defines all the helper classes. Only then can you copy
// and paste the Autopilot class and its instantiation into the console.

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
    static get all() { return [Angles.roll, Angles.pitch, Angles.yaw] }

    static errorIn(a) {
        return -numericPrefixOf($(`#${a}>div.error`).textContent);
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

    // contrib tracks the portion of the rate vector that is due to movement
    // along each axis. This is used by rateOf() to compute a proportion of the
    // overall vector.
    #contrib = [];
    #intervalID = 0;
    
    constructor() {
        this.#contrib = Axes.all.map(_ => 0);
        const freqMs = 100;
        const last = Axes.all.map(Axes.distAlong);
        
        this.#intervalID = setInterval(() => {
            const curr = Axes.all.map(Axes.distAlong);
            this.#contrib = curr.map((c, ax) => {
                const delta = c - last[ax];
                last[ax] = c;
                return delta / freqMs * 1000;
            });
        }, freqMs);
    }

    stop() {
        clearInterval(this.#intervalID);
    }

    static distAlong(ax) {
        return numericPrefixOf($(`#${ax}-range>div.distance`).textContent);
    }

    // rateOf performs computes the part of the rate HUD measurement that is
    // attributable to the specified axis. The contributions of each axis are
    // updated at a different rate to the value displayed in the HUD.
    rateOf(ax) {
        const i = Axes.indexOf(ax);
        const contrib = this.#contrib[i];
        const sign = contrib > 0 ? 1 : -1;
        
        const sumSq = this.#contrib.reduce((acc, curr) => acc + curr**2, 0);
        if (sumSq == 0){
            return 0;
        }
        const prop = contrib**2 / sumSq;
        return sign * Math.sqrt(Math.abs(Axes.rate * prop));
    }

    static get rate() {
        return numericPrefixOf($('#rate>div.rate').textContent);
    }

    static get range() {
        return numericPrefixOf($('#range>div.rate').textContent);
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
            'pitch': ['up', 'down'],
            'yaw': ['left', 'right'],
        };
    
        const txLabels = {
            'x': ['forward', 'backward'],
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
    static directionString(dir) {
        return dir == Controls.inc ? 'increase' : 'decrease';
    }

    change(angleOrTranslation, dir) {
        this.#buttons[angleOrTranslation][dir].click();
    }
}

// Autopilot implements a rudimentary system that aims for a velocity
// proportional to the negative of the error, which results in an exponential
// decay.
class Autopilot {
    #axes;
    #intervalID;
    
    constructor() {
        const ctrls = new Controls();
        this.#axes = new Axes();

        // Only start translation once the angles are within tolerance.
        var translate = false;
        const tolerance = 0.2;

        const verbosity = 0;
        const log = (lvl, msg) => {
            if (lvl <= verbosity) {
                console.info(msg);
            }
        }

        this.#intervalID = setInterval(() => {
            Angles.all.forEach(a => {
                const err = Angles.errorIn(a);
                const rate = Angles.rateOf(a);
                const goal = -err / 10;
                const delta = goal - rate;
                log(2, `${a}: ${err}° at ${rate}°/s; goal: ${goal}°/s requires delta of ${delta}`);

                if (delta == 0) {
                    return;
                }

                const dir = delta > 0 ? Controls.inc : Controls.dec;
                log(2, `${a} => ${Controls.directionString(dir)}`);
                ctrls.change(a, dir);
            });

            // Once angles are within tolerance then the axes are suffciciently
            // representative to use translation controls without having to
            // adjust with trig.
            const anglesReady = Angles.all.map(Angles.errorIn)
                                            .map(e => Math.abs(e) < tolerance)
                                            .reduce((acc, curr) => acc && curr, true);

            // If we've already started piloting along the translation axes then
            // keep doing it even if the angles fall outside tolerance again.
            //
            // TODO: change this strategy to a safer one of moving back to zero
            // translation until angles are ready again.
            translate = translate || anglesReady;
            if (!translate) {
                return;
            }

            Axes.all.forEach(a => {
                const err = Axes.distAlong(a);
                const rate = this.#axes.rateOf(a);
                const dampen = a == Axes.x && err < 5 ? 500 : 200;
                const goal = -err / dampen;
                const delta = goal - rate;
                log(2, `${a}: ${err}° at ${rate}°/s; goal: ${goal}°/s requires delta of ${delta}`);

                if (delta == 0) {
                    return;
                }

                // TODO: this mechanism overshoots so requires improved
                // precision. The goal velocity results in an exponentially
                // decaying range, but it's only achieved with significant
                // dampening.
                const dir = delta > 0 ? Controls.inc : Controls.dec;
                log(2, `${a} => ${Controls.directionString(dir)}`);
                ctrls.change(a, dir);
            });

        }, 20);
    }

    stop() {
        clearInterval(this.#intervalID);
        this.#axes.stop();
    }
}

a = new Autopilot();