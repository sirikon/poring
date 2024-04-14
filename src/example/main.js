const { h, component, useSignal, useEffect, useComputed, useRenderer } = poring;

const userName = useSignal("John");
const greeterEnabled = useSignal(false);

component("x-root", [], () => {
  useRenderer(() =>
    h("div", null, null, [
      h("h1", null, null, `Hello ${userName.get()}!`),
      h(
        "input",
        {
          type: "checkbox",
          id: "greeter-checkbox",
        },
        {
          checked: greeterEnabled.get(),
          onchange: (e) => greeterEnabled.set(e.target.checked),
        }
      ),
      h("label", { for: "greeter-checkbox" }, null, "Enable greeter"),
      greeterEnabled.get() && h("x-greeter"),
    ])
  );
});

component("x-greeter", [], () => {
  const userSurname = useSignal("Doe");
  const enableSurname = useSignal(true);
  const userFullName = useComputed(() => {
    const result = [userName.get()];
    if (enableSurname.get()) {
      result.push(userSurname.get());
    }
    return result.join(" ");
  });

  useRenderer(() =>
    h("div", null, null, [
      h(
        "input",
        {
          type: "text",
        },
        {
          value: userName.get(),
          oninput: (e) => {
            userName.set(e.target.value);
          },
        }
      ),
      h("br"),
      h(
        "input",
        {
          type: "text",
        },
        {
          value: userSurname.get(),
          oninput: (e) => {
            userSurname.set(e.target.value);
          },
        }
      ),
      h(
        "input",
        {
          type: "checkbox",
          id: "enable-surname-checkbox",
        },
        {
          checked: enableSurname.get(),
          onchange: (e) => enableSurname.set(e.target.checked),
        }
      ),
      h("label", { for: "enable-surname-checkbox" }, null, "Enable surname"),
      h("pre", null, null, [userFullName.get()]),
    ])
  );
});
