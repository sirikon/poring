(() => {
  function assertEqual(expected, actual) {
    if (expected !== actual) {
      fail(`Expected: ${expected}\n  Actual: ${actual}`);
    }
  }
  window.assertEqual = assertEqual;

  function fail(message) {
    const err = new Error(`${message}\n\n`);
    err.name = "";
    throw err;
  }
})();
