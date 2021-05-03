const fs = require("fs");
const XMLHelpers = require("./XMLHelpers");

function getChannelTransitionStrings(
  locations,
  transitions,
  registerSymbol,
  isLearnedModel
) {
  let newChannels = [];
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

    const newChan = {
      from: channelTransition.for,
      input: "CheckChannel",
      op: "Read",
      register: channelNumber,
      to: channelTransition.state_name,
    };
    newChannels.push(newChan);
  }

  return { string: newChannels, mappings: channelTransitions };
}

function getTransitionStrings(
  locations,
  transitions,
  registerSymbol,
  isLearnedModel,
  channelNameMappings
) {
  const newTransitions = [];

  for (const transition of transitions) {
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

    const newTran = {
      from: transition.from,
      input: transition.symbol,
      op: transitionType,
      register: register,
      to: transition.to,
    };
    newTransitions.push(newTran);
  }

  return newTransitions;
}

function deqConverter(JSONModel) {
  let { inputs, locations, transitions, registers } = XMLHelpers.all(JSONModel);

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

  // what do the registers start with i.e. x or r
  const registerSymbol = registers[0][0];

  const ISet = transitions.filter(
    (transition) => transition.symbol === "ISet"
  )[0];
  const ITau = transitions.filter((transition) => transition.symbol === "ITau");
  const otherTransitions = transitions.filter(
    (transition) => transition.symbol !== "ISet" && transition.symbol !== "ITau"
  );

  const ITauRegister = registers.length + 1;
  const ITauTransitions = ITau.map((transition) => {
    const register = ITauRegister;

    return {
      from: transition.from,
      input: "ITau",
      op: "Read",
      register: register,
      to: transition.to,
    };
  });

  let startingSetState = 0;
  // const registersToSet = registers.filter((reg) => !reg.includes("local_"));
  // registersToSet.push("");
  const registersToSet = Array(parseInt(process.env.REGS) + 1).fill(null);
  console.log("Regs to set with tau: " + registersToSet.length);

  const ISetTransitions = registersToSet
    .map((obj, i) => {
      const startState = i === 0 ? initialState.name : "kk_" + startingSetState;
      const endState =
        i === registersToSet.length - 1
          ? ISet.to
          : `kk_${startingSetState + 1}`;

      const register = i === registersToSet.length - 1 ? ITauRegister : i + 1;

      startingSetState++;
      return {
        from: startState,
        input: "ISet",
        op: "LFresh",
        register: register,
        to: endState,
      };
    })
    .filter((v) => v !== null);

  const channelTransitions = getChannelTransitionStrings(
    locations,
    otherTransitions,
    registerSymbol,
    isLearnedModel
  );

  const newTransitions = getTransitionStrings(
    locations,
    otherTransitions,
    registerSymbol,
    isLearnedModel
  );

  const allTransitions = [
    ...ISetTransitions,
    ...newTransitions,
    ...channelTransitions.string,
    ...ITauTransitions,
  ];

  // { name: '', registers: [1,2,3,n], prevStates: ["s1", "s2"], marked: false }
  const newStates = [];

  // get all states from "to" property on the transition
  for (const transition of allTransitions) {
    let existingState = newStates.find((state) => state.name === transition.to);

    if (!existingState) {
      const newState = {
        prevStates: [],
        name: transition.to,
        registers: [],
        marked: false,
      };
      newStates.push(newState);
      existingState = newState;
    }

    const registerExists = existingState.registers.includes(
      transition.register
    );

    if (!registerExists) {
      existingState.registers.push(parseInt(transition.register));
    }

    existingState.prevStates.push(transition.from);
  }

  for (const state of newStates) {
    const stateObjects = newStates.filter((s) =>
      state.prevStates.includes(s.name)
    );
    const queue = [...stateObjects];
    const prevStateRegisters = [];
    const seen = [];

    while (queue.length) {
      const current = queue.pop();
      const stateObjects = newStates.filter((s) =>
        current.prevStates.includes(s.name)
      );

      for (const stateObj of stateObjects) {
        const seenBefore = seen.find((s) => s.name === stateObj.name);
        if (!seenBefore) {
          queue.push(stateObj);
          seen.push(stateObj);
        }
      }

      prevStateRegisters.push(...current.registers);
    }

    state.registers = [
      ...new Set([...state.registers, ...prevStateRegisters]),
    ].sort();
  }

  const stateStrings = newStates
    .map((state) => {
      return `    <state>
      <id>${state.name}</id>
      <available-registers>
${state.registers.map((i) => `        <register>${i}</register>`).join("\n")}
      </available-registers>
    </state>`;
    })
    .join("\n")
    .trim();

  const transitionStrings = allTransitions
    .map((transition) => {
      return `    <transition>
      <from>${transition.from}</from>
      <input>${transition.input}</input>
      <op>${transition.op}</op>
      <register>${transition.register}</register>
      <to>${transition.to}</to>
    </transition>`;
    })
    .join("\n");

  const deqModel = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dra SYSTEM "dra.dtd">
<dra>
  <states>
${initialStateString}

    ${stateStrings}
  </states>
  <initial-state>${initialState.name}</initial-state>
  <transitions>
${transitionStrings}
  </transitions>
</dra>`;

  return deqModel;
}

module.exports = deqConverter;
