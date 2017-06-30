VUEC
====

Is a simple compiler for Vue.js Single File Components.
I love this framework because of its simplicity. I also love the fact that
it only needs a single script tag to start hacking!

<rant>
I wanted to use SFC, but the only solutions to compile those files was through
Babel. I don't want to install 200MB of deps on my laptop. I don't want to use
Webpack or Browserify. I don't want to write 500+ SLOC configuration files.
I don't need ES6, ES2015, TypeScript, ...
I want to be able to read the generated file, and I don't need any optimizations
I do not decide to include.
</rant>

[This comment on Reddit](https://www.reddit.com/r/vuejs/comments/5ops4d/light_weight_and_simple_way_to_use_single_file/) is a good explanation of what
I wanted to achieve.

Getting started
---------------
The tool is really basic and do not support a bunch of things. Styles (scoped
or not) will not be copied at this moment.

```bash
# install the cli
npm install -g vuec
# just compile your files to javascript
vuec component-1.vue component-2.vue > components.js
```

Example
-------

Simple Vue file `foo.vue`:

```vue
<template>
  <div class="container">
    <p class="hello">{{foo.text}}</p>
  </div>
</template>

<script>
module.exports = {
  props: ['foo']
}
</script>
```

Compile to something as simple as this:

```js
Vue.component("foo", {
  template: '<div class="container"><p class="hello">{{foo.text}}</p></div>',
  props: [ "foo" ]
});
```
