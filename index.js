#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var htmlparser = require('html-minifier/src/htmlparser');

var binName = 'vuec';
var help = (binName + ' [-o OUTPUT] INPUT...\n\n' +
  binName + ' compile Vue Single File Components to an OUTPUT javascript file.\n'
);
var states = {
  'VUEC': 0,
  'OPTIONS': 1,
  'OUTPUT': 2,
  'INPUTS': 3,
};

var mixedArgsError = 'mixed arguments.';
var noOutputError = 'no output has been provided and none can be infered.';
var noInputError = 'no input has been provided.';
var multipleOutputError = 'output has been provided multiple time.';
var emptyArgError = 'empty arguments are not supported.';
var invalidState = 'state machine entered an invalid state.';

function parseArg(res, state, arg) {
  if (!arg.length) throw emptyArg;

  switch (state) {
    case states.VUEC:
      var splitted = arg.split(path.sep);
      if (splitted[splitted.length-1] == binName) state += 1;
      break;
    case states.OPTIONS:
      if (arg[0] != '-') return parseArg(res, state + 2, arg);
      if (arg == '-h' || arg == '--help') throw help;
      if (arg.slice(0, '--output='.length) == '--output=')
        return parseArg(res, state + 1, arg.slice('--output='.length));

      if (arg == '-o' || arg == '--output') state += 1;
      break;
    case states.OUTPUT:
      if (res.inputs.length != 0) throw mixedArgsError;
      if (res.output != null) throw multipleOutputError;
      res.output = arg;
      state -= 1;
      break;
    case states.INPUTS:
      if (arg[0] == '-') throw mixedArgsError;
      res.inputs.push(arg)
      break;
  }
  return state;
}

function parseArgs() {
  var state = states.VUEC;
  var res = {
    'output': null,
    'inputs': []
  };

  process.argv.forEach(function(arg) {
    state = parseArg(res, state, arg);
  });

  if (res.inputs.length == 0) throw noInputError;
  if (res.output == null) {
    if (res.inputs.length > 1) throw noOutputError;
    var output = res.inputs[0].split('.')
    res.output = (
      output.length > 1
      ? output.slice(0, output.length -1).join('')
      : output[0]
    ) + '.js';
  }
  return res;
}
function parse(data) {
  var ctx = {};
  htmlparser.HTMLParser(data, {
    state: null,
    buf: [],
    states: ['template', 'script'],
    start: function(tag, attrs, unary) {
      for (var i = 0; i < this.states.length; i++) {
        if (tag == this.states[i]) {
          this.state = tag;
          return;
        }
      }
      this.buf.push('<' + tag);
      for (var i = 0, len = attrs.length; i < len; i++) {
        this.buf.push(
          ' ' + attrs[i].name + '="' +
          (attrs[i].value || '').replace(/"/g, '&#34;') + '"'
        );
      }
      this.buf.push((unary ? '/' : '') + '>');
    },
    end: function(tag) {
      if (this.state == tag) {
        ctx[this.state] = this.buf.join('');
        this.buf = [];
        this.state = null;
      } else {
        this.buf.push('</' + tag + '>');
      }
    },
    chars: function(text) {
      this.buf.push(text);
    },
  });
  return ctx;
}

function compile(context) {
  var stream = fs.createWriteStream(context.output, {encoding: 'utf8'});

  stream.once('open', function(_) {
    context.inputs.forEach(function(input) {
      fs.readFile(input, {encoding: 'utf8'}, function (err, data) {
        if (err) throw err;
        var ctx = parse(data);
        console.log(ctx);
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
    console.error('ERROR:', e, '\n');
    console.error(help);
  }
}
