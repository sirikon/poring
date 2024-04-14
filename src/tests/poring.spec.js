describe("Signals", () => {
  it("can do all the basic functions", () => {
    poring
      .runScope({}, () => {
        const signal = poring.useSignal("a");
        chai.expect(signal.get()).to.equal("a");
        signal.set("b");
        chai.expect(signal.get()).to.equal("b");
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
        chai.expect(execCount).to.equal(1);
        signal.set("b");
        chai.expect(execCount).to.equal(2);
        otherSignal.set("b");
        chai.expect(execCount).to.equal(2);
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
        chai.expect(computedSignal.get()).to.equal(2);
        signal.set(2);
        chai.expect(computedSignal.get()).to.equal(4);
      })
      .dispose();
  });
});
