(() => {
  function assertEqual(expected, actual) {
    function compare(expected, actual, path) {
      const expectedType = getType(expected);
      const actualType = getType(actual);
      if (expectedType === "function") {
        report(
          path,
          "Cannot compare functions",
          "not a function",
          "a function"
        );
      }
      if (expectedType !== actualType) {
        report(
          path,
          "Wrong primitive types",
          `${expectedType} (${JSON.stringify(expected)})`,
          `${actualType} (${JSON.stringify(actual)})`
        );
      }
      if (expectedType === "array") {
        if (expected.length !== actual.length) {
          report(
            path,
            "Array differs in length",
            expected.length,
            actual.length
          );
        }
        for (let i = 0; i < expected.length; i++) {
          compare(expected[i], actual[i], [...path, i]);
        }
        return;
      }
      if (expectedType === "object") {
        const expectedKeys = Object.keys(expected);
        const actualKeys = Object.keys(actual);
        const expectedKeysJoined = [...expectedKeys].sort().join(", ");
        const actualKeysJoined = [...actualKeys].sort().join(", ");
        if (
          expectedKeys.length !== actualKeys.length ||
          expectedKeysJoined !== actualKeysJoined
        ) {
          report(
            path,
            "Keys differ in object",
            expectedKeysJoined,
            actualKeysJoined
          );
        }
        for (const key of expectedKeys) {
          compare(expected[key], actual[key], [...path, key]);
        }
        return;
      }
      if (expected !== actual) {
        report(
          path,
          "Value differs",
          JSON.stringify(expected),
          JSON.stringify(actual)
        );
      }
    }
    function report(path, message, expected, actual) {
      const pathChunk = path.length > 0 ? `.${path.join(".")}: ` : "";
      fail(
        `${pathChunk}${message}\nExpected: ${expected}\n  Actual: ${actual}`
      );
    }
    compare(expected, actual, []);
  }
  window.assertEqual = assertEqual;

  function fail(message) {
    const err = new Error(`${message}\n\n`);
    err.name = "";
    throw err;
  }

  function getType(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    return typeof value;
  }
})();
