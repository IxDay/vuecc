#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var htmlparser = require('html-minifier/src/htmlparser');
var program = require('commander');

(program
  .version('0.1.0')
  .description('Compile Vue Single File Components to a javascript file')
  .option('-o, --output', 'javascript output file, if not specified try to infer it')
  .parse(process.argv)
)

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
  var stream;
  var cb = function() {
    context.args.forEach(function(input) {
      fs.readFile(input, {encoding: 'utf8'}, function (err, data) {
        if (err) throw err;
        stream.write(parse(data).template);
      });
    });
  }
  if (context.output) {
    stream = fs.createWriteStream(context.output, {encoding: 'utf8'});
    stream.once('open', cb);
  } else {
    stream = process.stdout;
    cb();
  }

}

compile(program);
