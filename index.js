#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var binName = "vuec";
var help = (binName + " [-o OUTPUT] INPUT...\n\n" +
  binName + " compile Vue Single File Components to an OUTPUT javascript file.\n"
);
var states = {
  "VUEC": 0,
  "OPTIONS": 1,
  "OUTPUT": 2,
  "INPUTS": 3,
};

var mixedArgsError = "mixed arguments.";
var noOutputError = "no output has been provided and none can be infered.";
var noInputError = "no input has been provided.";
var multipleOutputError = "output has been provided multiple time.";
var emptyArgError = "empty arguments are not supported.";
var invalidState = "state machine entered an invalid state.";

function parseArg(res, state, arg) {
  if (!arg.length) throw emptyArg;

  switch (state) {
    case states.VUEC:
      var splitted = arg.split(path.sep);
      if (splitted[splitted.length-1] == binName) state += 1;
      break;
    case states.OPTIONS:
      if (arg[0] != "-") return parseArg(res, state + 2, arg);
      if (arg == "-h" || arg == "--help") throw help;
      if (arg.slice(0, "--output=".length) == "--output=")
        return parseArg(res, state + 1, arg.slice("--output=".length));

      if (arg == "-o" || arg == "--output") state += 1;
      break;
    case states.OUTPUT:
      if (res.inputs.length != 0) throw mixedArgsError;
      if (res.output != null) throw multipleOutputError;
      res.output = arg;
      state -= 1;
      break;
    case states.INPUTS:
      if (arg[0] == "-") throw mixedArgsError;
      res.inputs.push(arg)
      break;
  }
  return state;
}

function parseArgs() {
  var state = states.VUEC;
  var res = {
    "output": null,
    "inputs": []
  };

  process.argv.forEach(function(arg) {
    state = parseArg(res, state, arg);
  });

  if (res.inputs.length == 0) throw noInputError;
  if (res.output == null) {
    if (res.inputs.length > 1) throw noOutputError;
    var output = res.inputs[0].split(".")
    res.output = (
      output.length > 1
      ? output.slice(0, output.length -1).join('')
      : output[0]
    ) + ".js";
  }
  return res;
}

var invalidTemplateError = function (char) {
  return "template is invalid, encounter an invalid char: " + char;
}
var spacechars = [" ", "\t", "\r", "\n", "\f", "\v"];

function Handler() {
  this.state = null;
  this.nodes = {};

  this.start = function (buf) {
    var state = buf.slice(1, buf.length-1).join("");
    if (state == "script" || state == "template") {
      this.state = state;
      return true;
    }
  }
  this.end = function (buf) {
    return buf.slice(2, buf.length-1).join("") == this.state
  }
  this.body = function (buf) {
    this.nodes[this.state] = buf.join("").trim();
  }
}


function expect(char, expected) {
  return char == expected;
}

function expects(char, chars) {
  if (!chars.length) return;
  return expect(char, chars[0]) || expects(char, chars.slice(1));
}

function parse(chunk, handler) {
  var buf = [], tag = [];
  var states = {
    "OUT": 0,
    "ENTERINGCLOSING": 1,
    "ENTERING": 2,
    "BODY": 3,
    "CLOSING": 4
  };
  var state = states.OUT;

  chunk.split("").forEach(function(char) {
    switch (state) {
      case states.OUT:
        if (expects(char, spacechars)) break;
        if (!expect(char, "<")) throw invalidTemplateError(char);

        state = states.ENTERINGCLOSING;
        tag.push(char);
        break;
      case states.ENTERINGCLOSING:
        state = expect(char, "/") ? states.CLOSING : states.ENTERING;
        tag.push(char);
        break;
      case states.ENTERING:
        tag.push(char);

        if (!expect(char, ">")) break;
        if (!handler.start(tag)) buf.push.apply(buf, tag);

        tag = [];
        state = states.BODY;
        break;
      case states.BODY:
        if (expect(char, "<")) {
          tag.push(char);
          state = states.ENTERINGCLOSING;
        } else {
          buf.push(char);
        }
        break;
      case states.CLOSING:
        tag.push(char);

        if (!expect(char, ">")) break;
        if (handler.end(tag)) {
          handler.body(buf);
          buf = [];
          state = states.OUT;
        } else {
          buf.push.apply(buf, tag);
          state = states.BODY;
        }
        tag = [];
        break;
      default:
        throw invalidState;
    }
  });
}

function compile(context) {
  var stream = fs.createWriteStream(context.output, {encoding: "utf8"});
  stream.once('open', function(_) {
    context.inputs.forEach(function(input) {
      fs.readFile(input, {encoding: "utf8"}, function (err, data) {
        if (err) throw err;

        var handler = new Handler();
        parse(data, handler);
        console.log(handler.nodes);
//        stream.write(data);
      });
    });
  });
}

try {
  compile(parseArgs());
} catch (e) {
  if (e == help) {
    console.log(help);
  } else {
    console.error("ERROR:", e, "\n");
    console.error(help);
  }
}
