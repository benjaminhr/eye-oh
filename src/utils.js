const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const builder = new xml2js.Builder();
const XMLHelpers = require("./XMLHelpers");

// POLYFILL: `pkg` doesn't support node@15 yet, polyfill .flatMap and .replaceAll
String.prototype.replaceAll = function (a, b) {
  return this.split(a).join(b);
};

// POLYFILL: `pkg` doesn't support node@15 yet, polyfill .flatMap and .replaceAll
Object.defineProperties(Array.prototype, {
  flatMap: {
    value: function (lambda) {
      return Array.prototype.concat.apply([], this.map(lambda));
    },
    writeable: false,
    enumerable: false,
  },
});

// promisify xml2js parseString function
function parseString(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// read and convert XML model
async function getRegisterXML(path) {
  try {
    const fileContents = fs.readFileSync(path, "utf-8");
    const json = await parseString(fileContents);
    return json;
  } catch (error) {
    console.log("Error: ", error);
    return {};
  }
}

function isPath(string) {
  return string === path.basename(string);
}

function writeXMLModel(path, JSONModel) {
  const xml = builder.buildObject(JSONModel);
  fs.writeFileSync(path, xml, "utf-8");
}

function formatXML(input, indent) {
  indent = indent || "\t";

  xmlString = input.replace(/^\s+|\s+$/g, "");

  xmlString = input
    .replace(/(<([a-zA-Z]+\b)[^>]*>)(?!<\/\2>|[\w\s])/g, "$1\n")
    .replace(/(<\/[a-zA-Z]+[^>]*>)/g, "$1\n")
    .replace(/>\s+(.+?)\s+<(?!\/)/g, ">\n$1\n<")
    .replace(/>(.+?)<([a-zA-Z])/g, ">\n$1\n<$2")
    .replace(/\?></, "?>\n<");

  xmlArr = xmlString.split("\n");

  let tabs = "";
  let start = 0;

  if (/^<[?]xml/.test(xmlArr[0])) start++;

  for (let i = start; i < xmlArr.length; i++) {
    let line = xmlArr[i].replace(/^\s+|\s+$/g, "");

    if (/^<[/]/.test(line)) {
      tabs = tabs.replace(indent, "");
      xmlArr[i] = tabs + line;
    } else if (/<.*>.*<\/.*>|<.*[^>]\/>/.test(line)) {
      xmlArr[i] = tabs + line;
    } else if (/<.*>/.test(line)) {
      xmlArr[i] = tabs + line;
      tabs += indent;
    } else {
      xmlArr[i] = tabs + line;
    }
  }

  xmlArr = xmlArr.filter((str) => {
    const set = new Set(str.split(""));
    if (set.size !== 1) {
      return str;
    }

    if (!set.has("\t")) {
      return str;
    }
  });

  return xmlArr.join("\n");
}

function writePiCalcRA(path, RA, json = false) {
  if (json) {
    return fs.writeFileSync(path, JSON.stringify(RA, null, 2), "utf-8");
  }

  const inputs = RA.inputs.map((i) => {
    return `            <symbol name="${i.name}">
    ${i.params.map((p) => `<param name="${p}" type="int" />`).join("\n")}
    </symbol>`;
  });

  const registers = Array(RA.registerCount)
    .fill(null)
    .map((r, i) => {
      return `<variable type="int" name="r${i + 1}">0</variable>`;
    });

  const locations = RA.locations.map((l, i) => {
    if (l.initial) {
      return `<location name="${l.name}" initial="true" />`;
    }
    return `<location name="${l.name}" />`;
  });

  const transitions = RA.transitions.map((t) => {
    if (!t.params.length) {
      return `<transition from="${t.from}" to="${t.to}" symbol="${t.symbol}"></transition>`;
    }

    let str = `<transition from="${t.from}" to="${t.to}" symbol="${t.symbol}" params="${t.params}">\n`;

    if (t.guard) {
      str += "<guard>";
      str += t.guard.replaceAll("&&", "&amp;&amp;");
      str += "\n</guard>";
    }

    if (t.assignments.length) {
      str += "\n<assignments>";
      str += t.assignments
        .map((a) => `\n<assign to="${a.reg}">${a.to}</assign>`)
        .join("\n");
      str += "\n</assignments>";
    }

    str += `\n</transition>`;
    return str;
  });

  const xml = `
<?xml version="1.0" encoding="UTF-8" ?>
  <register-automaton>
    <alphabet>
      <inputs>
        ${inputs.join("\n")}
      </inputs>
    </alphabet>
  
    <globals>
      ${registers.join("\n")}
    </globals>
  
    <locations>
      ${locations.join("\n")}
    </locations>
  
    <transitions>
        ${transitions.join("\n")}
    </transitions>
  </register-automaton>
  `;

  fs.writeFileSync(path, formatXML(xml), "utf-8");
}

module.exports = {
  getRegisterXML,
  parseString,
  isPath,
  writeXMLModel,
  writePiCalcRA,
};
