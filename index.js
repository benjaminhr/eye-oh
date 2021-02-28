const fs = require("fs");
const path = require("path");
const { program } = require("commander");

const utils = require("./src/utils");
const inputEnable = require("./src/inputEnable");
const addAlternatingIO = require("./src/addAlternatingIO");
const FRAToRA = require("./src/FRAToRA");

program
  .requiredOption("-i, --input <path>", "path to input model")
  .requiredOption("-o, --output <path>", "path to write output model")
  .option("-a, --alternating-only", "only run alternating i/o component")
  .option("-e, --input-enabling-only", "only run input enabling component")
  .option("--pifra", "");

program.parse(process.argv);

const options = program.opts();

/*
  Remove this later
*/
(async () => {
  try {
    if (options.pifra) {
      const piCalcFileName = options.input;
      const piCalcPath = path.resolve(process.cwd(), piCalcFileName);

      if (!fs.existsSync(piCalcPath)) {
        console.log(`Error: Cannot find pi-calculus file "${piCalcPath}"`);
      }

      await FRAToRA(piCalcPath);
      process.exit(0);
    }
  } catch (error) {
    console.log(error);
  }
})();

// const inputModelName = options.input;
// const inputModelPath = path.resolve(process.cwd(), inputModelName);

// const outputModelName = options.output;
// const outputModelPath = path.resolve(process.cwd(), outputModelName);

// if (!fs.existsSync(inputModelPath)) {
//   console.log(`Error: Cannot find input model "${inputModelPath}"`);
// }

// // entrypoint
// (async () => {
//   try {
//     const JSONModel = await utils.getRegisterXML(inputModelPath);

//     let finalModel;
//     if (options.alternatingOnly) {
//       console.log("ONLY RUNNING ALTERNATING I/O COMPONENT");
//       finalModel = addAlternatingIO(JSONModel);
//     } else if (options.inputEnablingOnly) {
//       console.log("ONLY RUNNING INPUT ENABLING COMPONENT");
//       finalModel = inputEnable(JSONModel);
//     } else {
//       const alternatingIOModel = addAlternatingIO(JSONModel);
//       finalModel = inputEnable(alternatingIOModel);
//     }

//     utils.writeModel(outputModelPath, finalModel);
//     console.log("Wrote new model: " + outputModelName);
//   } catch (error) {
//     console.log(error);
//   }
// })();
