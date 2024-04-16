const { useSignal, useEffect, useComputed, h, runScope } = poring;

describe("Signals", () => {
  it("can be getted and setted", () => {
    runScope({}, () => {
      const signal = useSignal("a");
      assertEqual(signal.get(), "a");
      signal.set("b");
      assertEqual(signal.get(), "b");
    }).dispose();
  });
  it("can be subscribed and unsubscribed", () => {
    runScope({}, () => {
      const signal = useSignal(0);
      let execCount = 0;
      const handler = () => {
        execCount++;
      };
      signal.subscribe(handler);
      assertEqual(execCount, 0);
      signal.set((s) => s + 1);
      assertEqual(execCount, 1);
      signal.unsubscribe(handler);
      signal.set((s) => s + 1);
      assertEqual(execCount, 1);
    }).dispose();
  });
});

describe("Effects", () => {
  it("re-executes when signals change ignoring other signals", () => {
    runScope({}, () => {
      const signal = useSignal("a");
      const otherSignal = useSignal("a");
      let execCount = 0;
      useEffect(() => {
        signal.get();
        execCount++;
      });
      assertEqual(execCount, 1);
      signal.set("b");
      assertEqual(execCount, 2);
      otherSignal.set("b");
      assertEqual(execCount, 2);
    }).dispose();
  });
  it("updates the depended signals", () => {
    runScope({}, () => {
      const number = useSignal(0);
      const boolean = useSignal(true);
      let execCount = 0;
      useEffect(() => {
        if (boolean.get()) {
          number.get();
        }
        execCount++;
      });
      assertEqual(execCount, 1);
      boolean.set(false);
      assertEqual(execCount, 2);
      number.set((n) => n + 1);
      assertEqual(execCount, 2);
      boolean.set(true);
      assertEqual(execCount, 3);
    }).dispose();
  });
});

describe("Computed", () => {
  it("re-calculates when signals change", () => {
    runScope({}, () => {
      const signal = useSignal(1);
      const computedSignal = useComputed(() => signal.get() * 2);
      assertEqual(computedSignal.get(), 2);
      signal.set(2);
      assertEqual(computedSignal.get(), 4);
    }).dispose();
  });
});

describe("Rendering", () => {
  describe("h", () => {
    const testCases = [
      [
        {
          tag: "tag",
          attributes: {},
          properties: {},
          children: [],
        },
        h("tag"),
      ],
      [
        {
          tag: "input",
          attributes: {
            type: "text",
            id: "testing",
          },
          properties: {
            value: "John Doe",
          },
          children: [],
        },
        h("input", { type: "text", id: "testing" }, { value: "John Doe" }),
      ],
      [
        {
          tag: "span",
          attributes: {},
          properties: {},
          children: ["Hello"],
        },
        h("span", "Hello"),
      ],
      [
        {
          tag: "div",
          attributes: {},
          properties: {},
          children: [
            {
              tag: "span",
              attributes: {},
              properties: {},
              children: ["Hello"],
            },
          ],
        },
        h("div", [h("span", "Hello")]),
      ],
    ];

    for (let i = 0; i < testCases.length; i++) {
      it(`test case #${i + 1}`, () => {
        assertEqual(testCases[i][0], testCases[i][1]);
      });
    }
  });
});
