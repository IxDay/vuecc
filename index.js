#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var htmlparser = require('html-minifier/src/htmlparser').HTMLParser;
var minify = require('html-minifier').minify;
var program = require('commander');
var uglify = require('uglify-js');
var util = require('util');

(program
  .version('0.1.0')
  .description('Compile Vue Single File Components to a javascript file')
  .option('-o , --output [file]', 'javascript output file')
  .parse(process.argv)
)

function parse(data, ctx) {
  htmlparser(data, {
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
        var value = (attrs[i].value || '').replace(/"/g, '&#34;')
        this.buf.push(util.format(' %s="%s"', attrs[i].name, value));
      }
      this.buf.push((unary ? '/' : '') + '>');
    },
    end: function(tag) {
      if (this.state == tag) {
        ctx[this.state] = this.buf.join('');
        this.buf = [];
        this.state = null;
      } else {
        this.buf.push(util.format('</%s>', tag));
      }
    },
    chars: function(text) {
      this.buf.push(text);
    },
  });
  return ctx;
}


function dump(ctx) {
  var options = {
    parse: {}, compress: false, mangle: false,
    output: {ast: true, code: false} // optional - faster if false
  };

  var wrapper = uglify.minify(util.format(
    "Vue.component('%s', {template: '%s'});",
    ctx.name, minify(ctx.template, {collapseWhitespace: true})
  ), options).ast;

  var properties = wrapper.body[0].body.args[1].properties;
  var inject = new uglify.TreeTransformer(function(node, descend){
    if (
      node.start.value == 'module'
      && node.body.operator == '='
      && node.body.left.end.value == 'exports'
    ) {
      properties.push.apply(properties, node.body.right.properties);
      return wrapper;
    } else {
      descend(node, this);
      return node;
    }
  });

  return (uglify
    .minify(ctx.script, options).ast
    .transform(inject)
    .print_to_string({beautify: true}) + '\n'
  );
}

function compile(context) {
  var stream;
  var cb = function() {
    context.args.forEach(function(input) {
      fs.readFile(input, {encoding: 'utf8'}, function (err, data) {
        if (err) throw err;
        stream.write(dump(parse(data, {name: path.basename(input, '.vue')})));
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
