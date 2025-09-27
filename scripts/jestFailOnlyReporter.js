const path = require('path');

class JestFailOnlyReporter {
  constructor(globalConfig, options = {}) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunStart() {
    if (!this._options.silentStart) {
      console.log('Running Jest (passing test output suppressed)...');
    }
  }

  onTestResult(test, testResult) {
    if (testResult.numFailingTests === 0) {
      return;
    }

    const relativePath = path.relative(
      this._globalConfig.rootDir || process.cwd(),
      testResult.testFilePath
    );

    console.log(`\nFAIL ${relativePath}`);

    testResult.testResults
      .filter((assertion) => assertion.status === 'failed')
      .forEach((assertion) => {
        console.log(`  ✖ ${assertion.fullName}`);
        assertion.failureMessages.forEach((message) => {
          // Failure messages already contain stack info and color codes.
          const trimmedMessage = message.endsWith('\n')
            ? message.slice(0, -1)
            : message;
          console.log(trimmedMessage);
        });
      });
  }

  onRunComplete(contexts, results) {
    if (results.numFailedTests === 0) {
      console.log('All tests passed (no passing test details shown).');
      return;
    }

    const suiteSummary = `Test Suites: ${results.numFailedTestSuites} failed, ${results.numPassedTestSuites} passed, ${results.numTotalTestSuites} total`;
    const testSummary = `Tests: ${results.numFailedTests} failed, ${results.numPassedTests} passed, ${results.numTotalTests} total`;

    const snapshot = results.snapshot || {};
    const snapshotSummaryParts = [];

    if (snapshot.unmatched) snapshotSummaryParts.push(`${snapshot.unmatched} failed`);
    if (snapshot.matched) snapshotSummaryParts.push(`${snapshot.matched} passed`);
    if (snapshot.updated) snapshotSummaryParts.push(`${snapshot.updated} updated`);
    if (snapshot.added) snapshotSummaryParts.push(`${snapshot.added} added`);

    const snapshotSummary = snapshotSummaryParts.length
      ? `Snapshots: ${snapshotSummaryParts.join(', ')}`
      : 'Snapshots: 0 total';

    const runtimeSeconds = results.startTime
      ? ((Date.now() - results.startTime) / 1000).toFixed(2)
      : null;

    console.log(`\n${suiteSummary}`);
    console.log(testSummary);
    console.log(snapshotSummary);
    if (runtimeSeconds) {
      console.log(`Time: ${runtimeSeconds}s`);
    }
  }
}

module.exports = JestFailOnlyReporter;
