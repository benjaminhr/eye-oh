const fs = require("fs");
const path = require("path");
const { program } = require("commander");

const utils = require("./src/utils");
const inputEnable = require("./src/inputEnable");
const addAlternatingIO = require("./src/addAlternatingIO");
const FRAtoRA = require("./src/FRAtoRA");

program
  .option("-i, --input <path>", "path to input model")
  .option("-o, --output <path>", "path to write output model")
  .option("-a, --alternating-only", "only run alternating i/o component")
  .option("-e, --input-enabling-only", "only run input enabling component")
  .option("--pifra", "");

program.parse(process.argv);

const options = program.opts();

const inputModelName = options.input;
const inputModelPath = path.resolve(process.cwd(), inputModelName);

const outputModelName = options.output;
const outputModelPath = path.resolve(process.cwd(), outputModelName);

if (!fs.existsSync(inputModelPath)) {
  console.log(`Error: Cannot find input model "${inputModelPath}"`);
}

// entrypoint
(async () => {
  try {
    let finalModel;

    if (options.pifra) {
      console.log("ONLY RUNNING PIFRA FRA TO RA CONVERSION");
      const RA = await FRAtoRA(inputModelPath);
      utils.writeRAjson(outputModelPath, RA);
    } else if (options.alternatingOnly) {
      console.log("ONLY RUNNING ALTERNATING I/O COMPONENT");
      const JSONModel = await utils.getRegisterXML(inputModelPath);
      finalModel = addAlternatingIO(JSONModel);
    } else if (options.inputEnablingOnly) {
      console.log("ONLY RUNNING INPUT ENABLING COMPONENT");
      const JSONModel = await utils.getRegisterXML(inputModelPath);
      finalModel = inputEnable(JSONModel);
    } else {
      // full complete run with all components
      const RA = await FRAtoRA(piCalcPath);
      const alternatingIOModel = addAlternatingIO(JSONModel, false);
      finalModel = inputEnable(alternatingIOModel, false);
    }

    if (finalModel) {
      utils.writeXMLModel(outputModelPath, finalModel);
      console.log("Wrote new model: " + outputModelName);
    }
  } catch (error) {
    console.log(error);
  }
})();
