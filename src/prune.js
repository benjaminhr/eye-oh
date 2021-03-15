const XMLHelpers = require("./XMLHelpers");

function prune(registerAutomaton) {
  let inputs = XMLHelpers.get.symbols(registerAutomaton, "inputs");
  let outputs = XMLHelpers.get.symbols(registerAutomaton, "output");
  let locations = XMLHelpers.get.locations(registerAutomaton);
  let transitions = XMLHelpers.get.transitions(registerAutomaton);

  /*
    Remove locations
  */
  const addedLocationNames = ["kk_", "vk_", "sink", "sink_two"];
  const newLocationNames = locations.filter((loc) => {
    const locationName = loc.name;
    return !addedLocationNames.some((name) => locationName.startsWith(name));
  });
  XMLHelpers.write.locations(registerAutomaton, newLocationNames);

  /*
    Remove inputs
  */
  const newInputs = inputs.filter((input) => input.name !== "ISet");
  XMLHelpers.write.symbols(registerAutomaton, "inputs", newInputs);

  /*
    Remove outputs
  */
  const newOutputs = outputs.filter(
    (output) =>
      output.name != "OOK" || output.name != "OFinal" || output.name != "ODummy"
  );
  XMLHelpers.write.symbols(registerAutomaton, "outputs", newOutputs);

  /*
    Remove transitions
  */

  // XMLHelpers.write.transitions(registerAutomaton, newTransitions);

  return registerAutomaton;
}

module.exports = prune;
