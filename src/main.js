const h = poring.h;
const signal = poring.signal;
const effect = poring.effect;
const compute = poring.compute;
const component = poring.component;
const renderer = poring.renderer;

const userName = signal("John");
const greeterEnabled = signal(false);

component('x-root', [], () => {
    renderer(() => h('div', {}, [
        h('h1', {}, `Hello ${userName.get()}!`),
        h('input', {
            type: 'checkbox',
            id: 'greeter-checkbox',
            checked: greeterEnabled.get(),
            onchange: (e) => greeterEnabled.set(e.target.checked),
        }),
        h('label', { for: 'greeter-checkbox' }, 'Enable greeter'),
        greeterEnabled.get() && h('x-greeter')
    ]))
})

component('x-greeter', [], () => {
    const userSurname = signal("Doe");
    const enableSurname = signal(true);
    const userFullName = compute(() => {
        const result = [userName.get()]
        if (enableSurname.get()) {
            result.push(userSurname.get())
        }
        return result.join(' ');
    });

    renderer(() => h('div', {}, [
        h('input', {type: 'text', value: userName.get(), oninput: (e) => { userName.set(e.target.value); }}),
        h('br'),
        h('input', {type: 'text', value: userSurname.get(), oninput: (e) => { userSurname.set(e.target.value); }}),
        h('input', {
            type: 'checkbox',
            id: 'enable-surname-checkbox',
            checked: enableSurname.get(),
            onchange: (e) => enableSurname.set(e.target.checked),
        }),
        h('label', { for: 'enable-surname-checkbox' }, 'Enable surname'),
        h('pre', {}, [userFullName.get()])
    ]))
})
