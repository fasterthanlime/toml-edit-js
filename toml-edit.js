//@ts-check

const TOMLParser = require("@iarna/toml/lib/toml-parser");
const { exception } = require("console");
const _taggedString = Symbol("__TAGGED_STRING");

class TaggedTOMLParser extends TOMLParser {
  parseBasicString() {
    return this.parseTaggedString(super.parseBasicString);
  }

  parseMultiString() {
    return this.parseTaggedString(super.parseMultiString);
  }

  parseMultiEnd2() {
    this.parseTaggedMultiEnd(super.parseMultiEnd2);
  }

  parseLiteralString() {
    return this.parseTaggedString(super.parseLiteralString);
  }

  parseLiteralMultiString() {
    return this.parseTaggedString(super.parseLiteralMultiString);
  }

  parseLiteralMultiEnd2() {
    this.parseTaggedMultiEnd(super.parseLiteralMultiEnd2);
  }

  parseTaggedString(fn) {
    /// we're already one character into the content
    /// of the string by that point
    let start = this.pos - 1;
    fn.call(this);
    /// we're already one character into the delimiter
    /// by that point
    let end = this.pos - 1;

    this.state.returned = {
      [_taggedString]: true,
      start,
      end,
      value: this.state.returned,
    };
  }

  parseTaggedMultiEnd(fn) {
    let beforeStackSize = this.stack.length;
    let ret = this.state.returned;
    fn.call(this);
    if (this.stack.length !== beforeStackSize) {
      /// we returned, make sure this is still a tagged string
      this.state.returned = ret;
      /// the closing delimiter is three characters
      ret.end = this.pos - 3;
    }
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
    throw new Error(
      `Value to replace is not a string, it's ${JSON.stringify(val, null, 2)}`
    );
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
