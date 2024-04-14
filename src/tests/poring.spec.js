const { useSignal, useEffect, useComputed, h } = poring;

describe("Signals", () => {
  it("can do all the basic functions", () => {
    poring
      .runScope({}, () => {
        const signal = useSignal("a");
        assertEqual(signal.get(), "a");
        signal.set("b");
        assertEqual(signal.get(), "b");
      })
      .dispose();
  });
});

describe("Effects", () => {
  it("re-executes when signals change", () => {
    poring
      .runScope({}, () => {
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
      })
      .dispose();
  });
});

describe("Computed", () => {
  it("re-calculates when signals change", () => {
    poring
      .runScope({}, () => {
        const signal = useSignal(1);
        const computedSignal = useComputed(() => signal.get() * 2);
        assertEqual(computedSignal.get(), 2);
        signal.set(2);
        assertEqual(computedSignal.get(), 4);
      })
      .dispose();
  });
});

describe("Rendering", () => {
  describe("h", () => {
    it("works properly", () => {
      console.log(h("tag"));
    });
  });
});
