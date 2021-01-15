//@ts-check

const TOMLParser = require("@iarna/toml/lib/toml-parser");
const { exception } = require("console");
const _taggedString = Symbol("__TAGGED_STRING");

class TaggedTOMLParser extends TOMLParser {
  parseBasicString() {
    if (!this.state.start) {
      this.state.start = this.pos - 1;
    }
    console.log("!!! parseBasicString (start)", this);
    let res = this.parseTaggedString(super.parseBasicString);
    return res;
  }

  call(fn, returnWith) {
    let oldStart = this.state.start;
    super.call(fn, returnWith);
    if (oldStart) {
      console.log(
        "calling",
        fn,
        "returning with",
        returnWith,
        "setting start to",
        oldStart
      );
      this.stack[this.stack.length - 1].start = oldStart;
    }
  }

  next(fn) {
    let oldState = this.state;
    let oldStart = this.state.start;
    super.next(fn);
    if (oldStart) {
      console.log(
        "next-ing from",
        oldState.parser,
        "to",
        fn,
        "setting start to",
        oldStart
      );
      this.state.start = oldStart;
    }
  }

  runOne() {
    console.log("runOne", this.state.parser, "start is", this.state.start);
    let ret = super.runOne();
    return ret;
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
    let stateStart = this.state.start;
    console.log("in parseTaggedString, state start = ", this.state.start);
    fn.call(this);
    /// we're already one character into the delimiter
    /// by that point
    let end = this.pos - 1;

    this.state.returned = {
      [_taggedString]: true,
      start: stateStart ? stateStart : start,
      end,
      value: this.state.returned,
    };
  }

  return(value) {
    let oldState = this.state;
    super.return(value);
    console.log(
      "returned from",
      oldState.parser,
      "to",
      this.state.parser,
      "with value",
      this.state.returned,
      "start was",
      oldState.start,
      "pos is now",
      this.pos
    );
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
