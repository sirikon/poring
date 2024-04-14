describe("Signals", () => {
  it("can do all the basic functions", () => {
    poring
      .runScope({}, () => {
        const signal = poring.useSignal("a");
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
        const signal = poring.useSignal("a");
        const otherSignal = poring.useSignal("a");
        let execCount = 0;
        poring.useEffect(() => {
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
        const signal = poring.useSignal(1);
        const computedSignal = poring.useComputed(() => signal.get() * 2);
        assertEqual(computedSignal.get(), 2);
        signal.set(2);
        assertEqual(computedSignal.get(), 4);
      })
      .dispose();
  });
});
