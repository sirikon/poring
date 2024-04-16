# Poring

<img src="assets/logo.svg" align="right" style="height:120px;">

> [!WARNING]  
> Work in progress. Rough edges and incomplete documentation.

Minimalistic vanilla JavaScript rendering library that is short and easy to read. [Go read it](./src/lib/poring.js).

Thanks to its nature, you don't need to trust a compiled, bundled and minified version of the library. Just copy the [single file you've already read](./src/lib/poring.js) into your project and you're done.

Reactivity is based on Signals and Effects. Produces [custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).

## Usage

Import the library by [downloading this file](./src/lib/poring.js) and referencing it in your HTML document.

```html
<script src="path/to/poring.js"></script>
```

After that, the global variable `poring` will be available. Extract from it anything you might need.

```js
const { h, component, useSignal, useEffect, useComputed, useRenderer } = poring;
```

### Signals

Signals store a value, any value, and you can get it, set it, subscribe to it, or unsubscribe later.

```js
const firstName = useSignal("John");
const onFirstNameChange = () => {
  console.log(`First Name: ${firstName.get()}`);
};
firstName.subscribe(onFirstNameChange);
firstName.set("Johnny");
// > First Name: Johnny
firstName.unsubscribe(onFirstNameChange);
firstName.set("Jimmy");
// Nothing happens.
```

But anyway, most of the time you will not subscribe directly to a Signal. Instead, you would use **Effects**.

---

### Effects

Effects are functions that get executed immediately after being defined and re-execute when any depended Signal changes, automatically.

```js
const firstName = useSignal("John");
useEffect(() => {
  console.log(`First Name: ${firstName.get()}`);
});
// > First Name: John
firstName.set("Johnny");
// > First Name: Johnny
```

Effects track which Signals they depend on after each execution, preventing re-executions in which the result wouldn't change.

```js
const firstName = useSignal("John");
const logName = useSignal(true);
useEffect(() => {
  if (logName.get()) {
    console.log(`First Name: ${firstName.get()}`);
  } else {
    console.log("Logging the name is disabled");
  }
});
// > First Name: John
firstName.set("Johnny")
// > First Name: Johnny
logName.set(false);
// > Logging the name is disabled
firstName.set("Jimmy")
// Nothing happens. The effect isn't executed because it does not
// depend on firstName anymore.
logName.set(true);
// > First Name: Jimmy
```

---

### Computed

A combination of a Signal and an Effect. A Computed is a value obtained from executing a function that depends on other Signals.

```js
const firstName = useSignal("John");
const lastName = useSignal("Doe");
const fullName = useComputed(() => `${firstName.get()} ${lastName.get()}`);
useEffect(() => {
  console.log(`Hello ${fullName.get()}!`);
});
// > Hello John Doe!
lastName.set("Malkovich");
// > Hello John Malkovich!
```

---

### Components

The `component` function allows creating reactive custom elements that make use of Signals and Effects.

When the custom element is unmounted from the DOM, disposes all the Signals and Effects created inside.

```js
component("x-greeter", [], () => {
  const firstName = useSignal("John");
  const lastName = useSignal("Doe");
  const fullName = useComputed(() => `${firstName.get()} ${lastName.get()}`);

  const firstNameChanged = (e) => firstName.set(e.target.value);
  const lastNameChanged = (e) => lastName.set(e.target.value);

  useRenderer(() =>
    h("div", [
      h("input", { type: "text" }, {
        value: firstName.get(),
        oninput: firstNameChanged, 
      }), h('br'),
      h("input", { type: "text" }, {
        value: lastName.get(),
        oninput: lastNameChanged,
      }), h('br'),
      h('span', `Hello ${fullName.get()}!`)
    ])
  );
});
```

```html
<x-greeter></x-greeter>
```
