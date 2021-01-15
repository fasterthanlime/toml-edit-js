//@ts-check

const TOMLParser = require("@iarna/toml/lib/toml-parser");
const _taggedValue = Symbol("__TAGGED_VALUE");

class TaggedTOMLParser extends TOMLParser {
  parseValue() {
    if (!this.state.__TAGGED_START) {
      this.state.__TAGGED_START = this.pos - 1;
    }
    console.log(
      "!!! parseValue, start is",
      this.state.__TAGGED_START,
      "stack is",
      this.stack.map((state) => state.parser)
    );
    return super.parseValue();
  }

  call(fn, returnWith) {
    let oldStart = this.state.__TAGGED_START;
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
      this.stack[this.stack.length - 1].__TAGGED_START = oldStart;
    }
  }

  next(fn) {
    let oldState = this.state;
    let oldStart = this.state.__TAGGED_START;
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
      this.state.__TAGGED_START = oldStart;
    }
  }

  runOne() {
    console.log("runOne", this.state.parser, "start is", this.state.start);
    let ret = super.runOne();
    return ret;
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
      JSON.stringify(this.state.returned, null, 2),
      "start was",
      oldState.__TAGGED_START,
      "pos is now",
      this.pos
    );

    if (oldState.__TAGGED_START) {
      console.log(
        "while returning, had oldState.start",
        oldState.__TAGGED_START
      );
      this.state.returned = {
        [_taggedValue]: true,
        start: oldState.__TAGGED_START,
        end: this.pos,
        value: this.state.returned,
      };
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

  if (!val[_taggedValue]) {
    throw new Error(
      `Value to replace is not a string, it's ${JSON.stringify(val, null, 2)}`
    );
  }

  let before = input.slice(0, val.start);
  let after = input.slice(val.end);
  let output = before + JSON.stringify(newValue) + after;

  try {
    parseWith(output, TOMLParser);
  } catch (e) {
    throw new Error(`Could not edit toml: ${e}`);
  }

  return output;
}

module.exports = { replaceTomlString };
