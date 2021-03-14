const util = require("util");
const child_process = require("child_process");
const exec = util.promisify(child_process.exec);
const utils = require("./utils.js");

// get the number of initially known names
// which then will be used in the ISet transition
// to set all initial register values
function getNumberOfInitialNames(configurationLine) {
  const initialConfiguration = configurationLine.split(" = ")[1] || "";
  const registerRegex = /{(.*)}/g;
  const registerRegexMatches = initialConfiguration.match(registerRegex);

  if (!registerRegexMatches.length) {
    console.log(
      "Unable to read initial configuration from pifra LTS",
      configurationLine
    );
    process.exit(1);
  }

  // e.g. [ '(1,_BAD)', '(2,#1)', '(3,#2)' ]
  const registers = registerRegexMatches[0]
    .replace("{", "")
    .replace("}", "")
    .replaceAll("),", "),X__X__X")
    .split(",X__X__X");

  return registers.length;
}

// go through all LTS lines, and find highest transition register number
// e.g. 3'4^ would have 4
function getRegisterCount(lines) {
  let maxRegisterValue = 0;
  const tauRegex = /s\d+\d*  t[ ]*  s\d+\d*/g;
  const transitionRegex = /(  [0-9][' ]?[0-9][\*\^ ]?)/g;
  const transitionRegisterRegex = /\d+/g;

  for (let i = 1; i < lines.length; i++) {
    const isTauTransition = lines[i].match(tauRegex);
    if (isTauTransition || !lines[i].length) continue;

    const currentLine = lines[i];
    const transition = currentLine
      .match(transitionRegex)[0]
      .match(transitionRegisterRegex)
      .map((reg) => parseInt(reg));

    const localMax = Math.max(...transition);
    if (localMax > maxRegisterValue) {
      maxRegisterValue = localMax;
    }
  }

  return maxRegisterValue;
}

function containsLocation(locations, locationName) {
  return locations.find((l) => l.name === locationName);
}

// converts a pifra generated FRA of a pi-calculus process
// into a JSON formatted RA
function parseLTS(LTS) {
  const LTSLines = LTS.split("\n");
  const registerCount = getRegisterCount(LTSLines);

  const locations = [];
  const transitions = [];
  const transitionRegex = /s\d+\d*  ([0-9][' ]?[0-9][\*\^ ]?|t[ ]*)  s\d+\d*/g;

  for (let i = 1; i < LTSLines.length; i++) {
    if (!LTSLines[i].length) continue; // empty line

    const line = LTSLines[i];

    // sN <transition> sN+1
    const transitionString = line.match(transitionRegex)[0];

    // collect locations
    const [fromLocation, toLocation] = transitionString.match(/s\d+\d*/g);

    if (!containsLocation(locations, fromLocation)) {
      locations.push({ name: fromLocation });
    } else if (!containsLocation(locations, toLocation)) {
      locations.push({ name: toLocation });
    }

    // get FRA transition i.e. t or 3'4*
    const FRATransition = transitionString
      .match(/(  [0-9][' ]?[0-9][\*\^ ]?|t[ ]*)/g)[0]
      .trim();

    const newTransition = {
      from: fromLocation,
      to: toLocation,
      symbol: "",
      assignments: [],
      params: "",
      guard: "",
    };

    // determine transition symbol
    if (FRATransition.includes("'")) {
      let [channel, value] = FRATransition.split("'");

      newTransition.symbol = "ISend";
      newTransition.params = "x1,x2";
      newTransition.guard = `r${channel}==x1`;

      // globally or locally fresh
      if (value.includes("*") || value.includes("^")) {
        value = value.replace("*", "").replace("^", "");
        newTransition.guard += " && (";

        for (let i = 1; i <= registerCount; i++) {
          newTransition.guard += `r${i}!=x2`;

          if (i < registerCount) {
            newTransition.guard += " && ";
          }
        }

        newTransition.guard += ")";
      } else {
        // known
        newTransition.guard += ` && r${value}==x2`;
      }

      newTransition.assignments.push({
        reg: `r${value}`,
        to: "x2",
      });
    } else if (FRATransition.includes("t")) {
      newTransition.symbol = "ITau";
    } else {
      let [channel, value] = FRATransition.split(" ");

      newTransition.symbol = "IReceive";
      newTransition.params = "x1,x2";
      newTransition.guard = `r${channel}==x1`;

      // globally or locally fresh
      if (value.includes("*") || value.includes("^")) {
        value = value.replace("*", "").replace("^", "");
        newTransition.guard += " && (";

        for (let i = 1; i <= registerCount; i++) {
          newTransition.guard += `r${i}!=x2`;

          if (i < registerCount) {
            newTransition.guard += " && ";
          }
        }

        newTransition.guard += ")";

        newTransition.assignments.push({
          reg: `r${value}`,
          to: "x2",
        });
      } else {
        // known
        newTransition.guard += ` && r${value}==x2`;
      }
    }

    transitions.push(newTransition);
  }

  // const numberOfInitialNames = getNumberOfInitialNames(LTSLines[0]);
  const ISetAssignmentArray = Array(registerCount).fill(null);
  // const ISetParams = ISetParamsArray.map((_, i) => `x${i + 1}`);

  const initRegTransition = {
    from: "k0",
    to: "s0",
    symbol: "ISet",
    assignments: ISetAssignmentArray.map((_, i) => ({
      reg: `r${i + 1}`,
      to: `x1`,
    })),
    params: "x1",
    guard: "",
  };

  transitions.unshift(initRegTransition);
  locations.unshift({ name: "k0", initial: true });

  const RA = {
    inputs: [
      { name: "ISet", params: ["x1"] },
      { name: "ITau", params: [] },
      { name: "ISend", params: ["x1", "x2"] },
      { name: "IReceive", params: ["x1", "x2"] },
    ],
    locations,
    transitions,
    registerCount,
  };

  // console.log(JSON.stringify(RA, null, 2));

  return RA;
}

async function FRAtoRA(piCalcPath) {
  // check if pifra exists, propagates error if it doesn't exist in PATH
  await exec("which pifra");

  // call pifra with process file and get stdout
  const { stdout: pifraOutput } = await exec(
    `pifra --output-pretty --disable-gc ${piCalcPath}`
  );

  // parse the pifra LTS
  const RA = parseLTS(pifraOutput);
  return RA;
}

module.exports = FRAtoRA;
