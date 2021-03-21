const fs = require("fs");
const util = require("util");
const path = require("path");
const { program } = require("commander");
const commands = require("./src/commands");

program
  .requiredOption("-i, --input <path>", "path to input model")
  .requiredOption("-o, --output <path>", "path to write output model")
  .option("-c, --conversion-only", "only run pifra LTS conversion component")
  .option("-a, --alternating-only", "only run alternating i/o component")
  .option("-e, --input-enabling-only", "only run input enabling component")
  .option("-j, --json", "only usable with --pifra-only to get JSON output")
  .option("-p, --prune", "remove all states/transitions added in eye-oh")
  .option("-v, --visualise", "use SUT/Tomte tools to visualise automata")
  .option("-d, --deq-converter", "convert model into deq XML format");

program.parse(process.argv);

const options = program.opts();

const inputModelName = options.input;
const inputModelPath = path.resolve(process.cwd(), inputModelName);

const outputModelName = options.output;
const outputModelPath = path.resolve(process.cwd(), outputModelName);

if (!fs.existsSync(inputModelPath)) {
  console.log(`Error: Cannot find input model "${inputModelPath}"`);
  process.exit(1);
}

// entrypoint
(async () => {
  try {
    if (options.deqConverter) {
      await commands.convertToDeq({
        options,
        outputModelName,
        outputModelPath,
        inputModelPath,
      });
    } else {
      await commands.runInputModel({
        options,
        outputModelName,
        outputModelPath,
        inputModelPath,
      });
    }
  } catch (error) {
    console.log(error);
  }
})();
