const fs = require("fs");
const XMLHelpers = require("./XMLHelpers");

function getChannelTransitionStrings(
  locations,
  transitions,
  registerSymbol,
  isLearnedModel
) {
  let channelTransitionString = "";
  let channelStateCounter = 0; // vv_${}
  const channelTransitions = []; // [{ for: 's1', channel: 'x1', state_name: vv_something }]

  for (const location of locations) {
    const outGoingTransitionNames = transitions.filter(
      (transition) => transition.from === location.name
    );

    for (const transition of outGoingTransitionNames) {
      const channelGuard = transition.guard.split("&&")[0];
      const regex = new RegExp(
        `(${registerSymbol}\\d+)(?!.*${registerSymbol}\\d+)`,
        "g"
      );
      const match = regex.exec(channelGuard);

      if (!match) {
        console.log("could not find channel for ", transition);
      }

      const channel = match[0].match(/\d/g).join("");
      const channelTransition = channelTransitions.find(
        (c) => c.channel === channel && c.for === location.name
      );

      if (!channelTransition) {
        const newTransition = {
          for: location.name,
          channel,
          state_name: `vv_${channelStateCounter++}`,
        };
        channelTransitions.push(newTransition);
        transition.from = newTransition.state_name;
      } else {
        transition.from = channelTransition.state_name;
      }
    }
  }

  for (const channelTransition of channelTransitions) {
    channelNumber = isLearnedModel
      ? parseInt(channelTransition.channel) + 1
      : channelTransition.channel;

    channelTransitionString += `
    <transition>
      <from>${channelTransition.for}</from>
      <input>CheckChannel</input>
      <op>Read</op>
      <register>${channelNumber}</register>
      <to>${channelTransition.state_name}</to>
    </transition>\n`;
  }

  return { string: channelTransitionString, mappings: channelTransitions };
}

function getTransitionStrings(
  locations,
  transitions,
  registerSymbol,
  isLearnedModel,
  channelNameMappings
) {
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
        if (
          assignments[0].to.includes("-10000") ||
          assignments[0].reg.includes("local_")
        ) {
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
  let { inputs, locations, transitions, registers } = XMLHelpers.all(JSONModel);

  const ITauRegister = "10000"; // remember that it will be incremented by 1 in learned models
  registers.push(ITauRegister); // add dummy register for ITau transitions to read off

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

  if (registers.find((reg) => reg.includes("local_"))) {
    registers = registers.filter((reg) => !reg.includes("local_"));
  }

  // const newRegisterMapping = {};
  // if (registers.find((reg) => reg.includes("local_"))) {
  //   let lastGoodRegisterIndex = 0;
  //   for (let i = 0; i < registers.length; i++) {
  //     if (registers[i].includes("local_")) {
  //       // the index of the last register that doesn't have local_
  //       lastGoodRegisterIndex = i - 1;
  //     }
  //   }

  //   let newRegisterCounter = parseInt(
  //     registers[lastGoodRegisterIndex].match(/\d/g).join("")
  //   );

  //   registers = registers.map((reg) => {
  //     if (reg.includes("local_")) {
  //       const newRegisterName = `x${lastGoodRegisterIndex++}`;
  //       newRegisterMapping[reg] = newRegisterName;
  //       return newRegisterName;
  //     }

  //     return reg;
  //   });
  // }

  // // change transition assignments if there are local_X registers
  // for (let transition of transitions) {
  //   for (let assignment of transition.assignments) {
  //     if (assignment.to.includes("local_")) {
  //       assignment.to = newRegisterMapping[assignment.to];
  //     }
  //   }
  // }

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

  const ITauStrings = ITau.map((transition) => {
    const register = isLearnedModel ? parseInt(ITauRegister) + 1 : ITauRegister;
    return `
    <transition>
      <from>${transition.from}</from>
      <input>ITau</input>
      <op>Read</op>
      <register>${register}</register>
      <to>${transition.to}</to>
    </transition>\n`;
  })
    .join("")
    .trim();

  let startingSetState = 0;
  const ISetStrings = registers
    .map((reg, i) => {
      if (reg === ITauRegister) {
        return null;
      }

      const startState = i === 0 ? initialState.name : "kk_" + startingSetState;
      const endState =
        i === registers.length - 1 ? ISet.to : `kk_${startingSetState + 1}`;

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
    .filter((v) => v !== null)
    .join("")
    .trim();

  const ISetStates = Array(registers.length - 1)
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

  const channelTransitions = getChannelTransitionStrings(
    locations,
    otherTransitions,
    registerSymbol,
    isLearnedModel
  );

  const channelStates = channelTransitions.mappings
    .map((obj) => {
      return `    <state>
      <id>${obj.state_name}</id>
      <available-registers> 
${registerStrings}
      </available-registers>
    </state>
  `;
    })
    .join("\n")
    .trim();

  const transitionStrings = getTransitionStrings(
    locations,
    otherTransitions,
    registerSymbol,
    isLearnedModel
  );

  const deqModel = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dra SYSTEM "dra.dtd">
<dra>
  <states>
${initialStateString}

    ${ISetStates}
    
    ${stateStrings}

    ${channelStates}
  </states>
  <initial-state>${initialState.name}</initial-state>
  <transitions>
    ${ISetStrings}

    ${channelTransitions.string}

    ${transitionStrings}

    ${ITauStrings}
  </transitions>
</dra>`;

  return deqModel;
}

module.exports = deqConverter;
