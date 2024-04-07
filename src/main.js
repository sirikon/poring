const h = poring.h;
const signal = poring.signal;
const effect = poring.effect;
const compute = poring.compute;
const component = poring.component;
const renderer = poring.renderer;

const userName = signal("John");

component('x-greeter', [], () => {
    const userSurname = signal("Doe");

    const userFullName = compute(() => `${userName.get()} ${userSurname.get()}`);

    renderer(() => h('div', {}, [
        h('input', {type: 'text', value: userName.get(), oninput: (e) => { userName.set(e.target.value); }}),
        h('input', {type: 'text', value: userSurname.get(), oninput: (e) => { userSurname.set(e.target.value); }}),
        h('p', {}, [userFullName.get()])
    ]))
})
