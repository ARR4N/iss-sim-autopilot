# SPACEX ISS-simulator autopilot

The [simulator](https://iss-sim.spacex.com/) is pretty much just
[nerd-sniping](https://xkcd.com/356/) engineers who want to  build an autopilot
system. I've provided programmatic access to controls and HUD values, so feel
free to sub out the actual autopilot mechanism for your own, and let me know
what you come up with (TensorFlow.js RL anyone?).

Each class is documented with example usage so I'm not duplicating it here.

## Usage

The code is designed to be copied and pasted in two parts into the console once
you're already at the flight-control screen. The first defines the helper
classes and the second, the autopilot—they must be split to avoid JavaScripts
"temporal dead zone". Handling of intro and success/failure screens is low
priority.

## Known Issues

* It comes in too fast along the x axis!
* Velocity relative to the ISS isn't provided in the HUD so it's calculated.
  Badly. There's a trade-off between sampling frequency and measurement
  precision (0.1m) in that too high a frequency increases the chance of there
  being a zero delta. I'll fix it soon.

### Style

I don't know modern JavaScript. I barely know old JavaScript. I'm a backend
engineer and the lack of types scares me. Apologies for this not being idiomatic
JS.