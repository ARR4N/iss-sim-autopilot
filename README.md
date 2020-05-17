# SPACEX ISS-simulator autopilot

The [https://iss-sim.spacex.com/](simulator) is pretty much just
[nerd-sniping](https://xkcd.com/356/) engineers who want to  build an autopilot
system. I've provided programmatic access to controls and HUD values, so feel
free to sub out the actual autopilot mechanism for your own, and let me know
what you come up with (TensorFlow.js RL anyone?).

Each class is documented with example usage so I'm not duplicating it here.

## Usage

The code is designed to be copied and pasted in its entirety into the console
once you're already at the flight-control screen. Handling of intro and
success/failure screens is low priority.

## Caveats

Velocity relative to the ISS isn't provided in the HUD so it's calculated.
Badly. There's a trade-off between sampling frequency and measurement precisionm
(0.1m) in that too high a frequency increases the chance of there being a zero
delta. I'll fix it soon.

### Style

I don't know modern JavaScript. I barely know old JavaScript. I'm a backend
engineer and the lack of types scares me. Apologies for this not being idiomatic
JS.