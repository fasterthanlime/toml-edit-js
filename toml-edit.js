//@ts-check

const TOMLParser = require("@iarna/toml/lib/toml-parser");
const { exception } = require("console");
const _taggedString = Symbol("__TAGGED_STRING");

class TaggedTOMLParser extends TOMLParser {
  parseBasicString() {
    let start = this.pos - 1;
    super.parseBasicString();
    let end = this.pos - 1;

    this.state.returned = {
      [_taggedString]: true,
      start,
      end,
      value: this.state.returned,
    };
  }
}

function parseWith(input, Parser) {
  const parser = new Parser();
  parser.parse(input);
  return parser.finish();
}

function replaceTomlString(input, path, newValue) {
  let object = parseWith(input, TaggedTOMLParser);

  // this will throw if `path` is invalid
  for (let i = 0; i < path.length - 1; i++) {
    let key = path[i];
    object = object[key];
    if (!object) {
      // path not found
      return input;
    }
  }
  let val = object[path[path.length - 1]];
  if (!val) {
    // path not found
    return input;
  }

  if (!val[_taggedString]) {
    throw new Error(`Value to replace is not a string`);
  }

  let before = input.slice(0, val.start);
  let after = input.slice(val.end);
  let output = before + newValue + after;

  try {
    parseWith(output, TOMLParser);
  } catch (e) {
    throw new Error(`Could not edit toml: ${e}`);
  }

  return output;
}

module.exports = { replaceTomlString };
