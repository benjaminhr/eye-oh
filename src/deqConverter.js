const fs = require("fs");
const { start } = require("repl");
const XMLHelpers = require("./XMLHelpers");

function getTransitionStrings(transitions, registerSymbol, isLearnedModel) {
  const otherTransitionStrings = transitions
    .map((transition) => {
      let transitionType; // LFresh GFresh Read

      if (transition.symbol.startsWith("IKnown")) {
        transitionType = "Read";
      } else {
        transitionType = "LFresh";
      }

      let register = -1; // default - error

      const assignments = transition.assignments;
      if (assignments.length !== 0) {
        // using learned model which throws registers away
        if (assignments[0].to.includes("-10000")) {
          // get last register from guard
          const guards = transition.guard.split("&&");
          const lastGuard = guards[guards.length - 1].replace(")", "");
          const regex = new RegExp(
            `(${registerSymbol}\\d+)(?!.*${registerSymbol}\\d+)`,
            "g"
          );

          const match = regex.exec(lastGuard);

          if (match !== null) {
            register = match[0];
          } else {
            console.log(
              "Error: Could not find register in guard for transition here",
              transition
            );
          }
        } else {
          register = assignments[0].to;
        }
      } else {
        // get last register from guard
        const guards = transition.guard.split("&&");
        const lastGuard = guards[guards.length - 1].replace(")", "");
        const regex = new RegExp(
          `(${registerSymbol}\\d+)(?!.*${registerSymbol}\\d+)`,
          "g"
        );
        const match = regex.exec(lastGuard);

        if (match !== null) {
          register = match[0];
        } else {
          console.log(
            "Error: Could not find register in guard for transition",
            transition
          );
        }
      }

      register = parseInt(register.match(/\d/g).join(""));

      if (isLearnedModel) {
        register++;
      }

      return `
    <transition>
      <from>${transition.from}</from>
      <input>${transition.symbol}</input>
      <op>${transitionType}</op>
      <register>${register}</register>
      <to>${transition.to}</to>
    </transition>\n`;
    })
    .join("")
    .trim();

  return otherTransitionStrings;
}

function deqConverter(JSONModel) {
  const { inputs, locations, transitions, registers } = XMLHelpers.all(
    JSONModel
  );

  const isLearnedModel = transitions.find((transition) => {
    if (transition.assignments.length > 0) {
      return transition.assignments[0].to.includes("-1000");
    }
    return false;
  })
    ? true
    : false;
  const initialState = locations.find((location) => location.initial);

  if (!initialState) {
    console.log("Could not find an initial state.");
    return "";
  }

  const initialStateString = `    <state>
      <id>${initialState.name}</id>
      <available-registers />
    </state>`;

  const registerStrings = registers
    .map((register) => {
      register = parseInt(register.match(/\d/g).join(""));

      if (isLearnedModel) {
        register++;
      }

      return `        <register>${register}</register>`;
    })
    .join("\n");

  // what do the registers start with i.e. x or r
  const registerSymbol = registers[0][0];

  const stateStrings = locations
    .filter((location) => !location.initial)
    .map((location) => {
      return `    <state>
      <id>${location.name}</id>
      <available-registers> 
${registerStrings}
      </available-registers>
    </state>
    `;
    })
    .join("\n")
    .trim();

  const ISet = transitions.filter(
    (transition) => transition.symbol === "ISet"
  )[0];
  const ITau = transitions.filter((transition) => transition.symbol === "ITau");
  const otherTransitions = transitions.filter(
    (transition) => transition.symbol !== "ISet" && transition.symbol !== "ITau"
  );

  let startingSetState = 0;
  const ISetStrings = ISet.assignments
    .map((assignment, i) => {
      const startState = i === 0 ? initialState.name : "kk_" + startingSetState;
      const endState =
        i === ISet.assignments.length - 1
          ? ISet.to
          : `kk_${startingSetState + 1}`;

      startingSetState++;

      return `
    <transition>
      <from>${startState}</from>
      <input>ISet</input>
      <op>LFresh</op>
      <register>${i + 1}</register>
      <to>${endState}</to>
    </transition>\n`;
    })
    .join("")
    .trim();

  const ISetLocations = Array(ISet.assignments.length - 1)
    .fill(null)
    .map((loc, i) => {
      return `    <state>
      <id>${"kk_" + (i + 1)}</id>
      <available-registers> 
        <register>${i + 1}</register>
      </available-registers>
    </state>
    `;
    })
    .join("\n")
    .trim();

  const transitionStrings = getTransitionStrings(
    otherTransitions,
    registerSymbol,
    isLearnedModel
  );

  const deqModel = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dra SYSTEM "dra.dtd">
<dra>
  <states>
${initialStateString}

    ${ISetLocations}
    
    ${stateStrings}
  </states>
  <initial-state>${initialState.name}</initial-state>
  <transitions>
    ${ISetStrings}

    ${transitionStrings}
  </transitions>
</dra>`;

  return deqModel;
}

module.exports = deqConverter;
