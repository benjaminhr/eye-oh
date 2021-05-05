const fs = require("fs");
const util = require("util");
const path = require("path");
const child_process = require("child_process");
const exec = util.promisify(child_process.exec);

const utils = require("./utils");
const inputEnable = require("./inputEnable");
const addAlternatingIO = require("./addAlternatingIO");
const FRAtoRA = require("./FRAtoRA");
const prune = require("./prune");
const deqConverter = require("./deqConverter");
const isDeterministic = require("./determinismChecker");

async function runInputModel({
  options,
  outputModelName,
  outputModelPath,
  inputModelPath,
}) {
  let finalModel;

  if (options.conversionOnly) {
    console.log("ONLY RUNNING PIFRA FRA TO RA CONVERSION");
    const RA = await FRAtoRA(inputModelPath);
    utils.writeJSONRA(outputModelPath, RA, options.json);
  } else if (options.alternatingOnly) {
    console.log("ONLY RUNNING ALTERNATING I/O COMPONENT");
    const JSONModel = await utils.getRegisterXML(inputModelPath);
    finalModel = addAlternatingIO(JSONModel);
  } else if (options.inputEnablingOnly) {
    console.log("ONLY RUNNING INPUT ENABLING COMPONENT");
    const JSONModel = await utils.getRegisterXML(inputModelPath);
    finalModel = inputEnable(JSONModel);
  } else if (options.prune) {
    console.log("ONLY RUNNING PRUNING COMPONENT");
    const JSONModel = await utils.getRegisterXML(inputModelPath);
    const RA = prune(JSONModel);
    utils.writeJSONRA(outputModelPath, RA);
  } else if (options.deterministic) {
    const JSONModel = await utils.getRegisterXML(inputModelPath);
    isDeterministic(JSONModel); // prints error if not deterministic
  } else if (options.visualise) {
    await exec(
      `NAME="${outputModelName.replace(
        ".register.xml",
        ""
      )}" && sut_register2uppaal $NAME.register.xml $NAME.xml && sut_uppaal2layoutformat $NAME.xml $NAME.pdf && open $NAME.pdf`
    );
  } else {
    if (!inputModelPath.endsWith(".pi")) {
      console.log(`Error: Input model file does not have extension .pi`);
      process.exit(1);
    }

    // full complete run with all components
    const RA = await FRAtoRA(inputModelPath);
    utils.writeJSONRA(outputModelPath, RA);

    const JSONModel = await utils.getRegisterXML(outputModelPath);
    // const deterministic = isDeterministic(JSONModel); // prints error if not deterministic

    finalModel = addAlternatingIO(JSONModel);
    finalModel = inputEnable(JSONModel);
  }

  if (finalModel) {
    utils.writeXMLModel(outputModelPath, finalModel);
    console.log("Wrote new model: " + outputModelName);
  }
}

async function convertToDeq({
  options,
  outputModelName,
  outputModelPath,
  inputModelPath,
}) {
  const JSONModel = await utils.getRegisterXML(inputModelPath);
  const deqModel = deqConverter(JSONModel);

  fs.writeFileSync(outputModelPath, deqModel, "utf-8");
  console.log("Wrote deq model: " + outputModelName);
}

module.exports = {
  runInputModel,
  convertToDeq,
};
