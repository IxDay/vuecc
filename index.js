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

function parseArg(res, state, arg) {
  if (!arg.length) throw emptyArg;

  switch (state) {
    case states.VUEC:
      var splitted = arg.split(path.sep);
      if (splitted[splitted.length-1] == binName) {
        state += 1;
      }
      break;
    case states.OPTIONS:
      if (arg[0] != "-") {
        parseArg(res, state + 2, arg);
      } else if (arg == "-h" || arg == "--help") {
        throw help;
      } else if (arg == "-o" || arg == "--output") {
        state += 1;
      } else if (arg.slice(0, "--output=".length) == "--output=") {
        parseArg(res, state + 1, arg.slice("--output=".length));
      }
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

function compile(context) {
  console.log(context);
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
