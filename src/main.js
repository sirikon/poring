const h = poring.h;
const signal = poring.signal;
const effect = poring.effect;
const component = poring.component;
const renderer = poring.renderer;

const text = signal("Hello World!");

component('x-echo', [], () => {
    effect(() => {
        console.log("New text: ", text.get());
    })    
    renderer(() => h('div', {}, [
        h('input', {type: 'text', value: text.get(), oninput: (e) => { text.set(e.target.value); }}),
        h('p', {}, [text.get()])
    ]))
})
