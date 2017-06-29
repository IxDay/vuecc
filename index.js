#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var binName = "vuec";
var mixedArgsError = "mixed arguments";
var noOutputError = "no output has been provided and none can be infered";
var noInputError = "no input has been provided";
var multipleOutputError = "output has been provided multiple time";

function parseArgv() {
  var states = {
    "VUEC": 0,
    "INPUTS": 1,
    "OUTPUT": 2,
  };
  var state = states.VUEC;
  var res = {
    "output": null,
    "inputs": []
  };
  var setOuput = function(output) {
    if (res.inputs.length != 0) throw mixedArgsError;
    if (res.output != null) throw multipleOutputError;
    res.output = output;
  };

  process.argv.forEach(function(arg) {
    switch (state) {
      case states.VUEC:
        var splitted = arg.split(path.sep);
        if (splitted[splitted.length-1] == binName) {
          state += 1;
        }
        break;
      case states.INPUTS:
        if (arg == "-o" || arg == "--output") {
          state += 1;
        } else if (arg.slice(0, "--output=".length) == "--output=") {
          setOuput(arg.slice("--output=".length));
        } else {
          res.inputs.push(arg)
        }
        break;
      case states.OUTPUT:
        setOuput(arg);
        state -= 1;
        break;
    }
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
  compile(parseArgv());
} catch (e) {
  console.error("ERROR:", e)
}
