const XMLHelpers = require("./XMLHelpers");

function prune(registerAutomaton) {
  const inputs = XMLHelpers.get.symbols(registerAutomaton, "inputs");
  const outputs = XMLHelpers.get.symbols(registerAutomaton, "output");
  const locations = XMLHelpers.get.locations(registerAutomaton);
  const transitions = XMLHelpers.get.transitions(registerAutomaton);

  // Remove locations
  const addedLocationNames = ["m"];
  const newLocations = locations.filter((loc) => {
    const locationName = loc.name;
    return !addedLocationNames.some((name) => locationName.startsWith(name));
  });

  // Remove inputs - we don't remove any (e.g. ISet)
  const newInputs = inputs.map((input) => ({
    name: input.name,
    params: input.param.map((p) => p.name),
  }));

  // Remove outputs
  const addedOutputNames = ["OOK", "OFinal", "ODummy"];
  const newOutputs = outputs
    .filter((output) => !removedOutputNames.includes(output.name))
    .map((output) => ({
      name: output.name,
      params: output.param.map((p) => p.name),
    }));

  // Remove transitions
  // {
  //   "from": "s2",
  //   "to": "s5",
  //   "symbol": "ISend",
  //   "assignments": [
  //     {
  //       "reg": "r1",
  //       "to": "x2"
  //     }
  //   ],
  //   "params": "x1,x2",
  //   "guard": "r1==x1 && (r1!=x2 && r2!=x2)"
  // }
  const newTransitions = [];
  for (const transition of transitions) {
    const fromLocation = transition.from;
    const toLocation = transition.to;
    const transitionSymbol = transition.symbol;

    if (transitionSymbol.startsWith("O")) {
      continue;
    }

    // transitions going out of the next state
    const toLocationTransitions = transitions.filter(
      (t) => t.from === toLocation
    );

    const nextLocationHas = (symbol) => {
      return toLocationTransitions.find((t) => t.symbol == symbol);
    };

    if (nextLocationHas("ODummy")) {
      // remove ODummy transition, current transition
      // console.log(
      //   "removing: " +
      //     transition.symbol +
      //     " from " +
      //     transition.from +
      //     " to " +
      //     transition.to
      // );
    } else if (nextLocationHas("OOK")) {
      transition.to = toLocationTransitions[0].to;
      newTransitions.push(transition);
    } else if (nextLocationHas("OFinal")) {
      // console.log("OFinal " + transition.symbol);
      transition.to = toLocationTransitions[0].to;
      newTransitions.push(transition);
    }
  }

  const registerCount =
    registerAutomaton["register-automaton"].globals[0].variable.length;

  const RA = {
    inputs: newInputs,
    outputs: newOutputs,
    locations: newLocations,
    transitions: newTransitions,
    registerCount,
  };

  return RA;
}

module.exports = prune;
