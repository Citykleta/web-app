const isAssertionResult = (data) => data.actual && data.expected;
function FailingAssertion(data) {
    this.actual = data.actual;
    this.expected = data.expected;
    this.description = data.description;
    this.location = data.at;
}
const browserReporter = (message) => {
    switch (message.type) {
        case "TEST_START" /* TEST_START */:
            const m = message;
            console.groupCollapsed(m.data.description);
            break;
        case "ASSERTION" /* ASSERTION */:
            const { data } = message;
            console.assert(data.pass, `${data.description} should have passed`);
            if (!data.pass && isAssertionResult(data)) {
                console.dir(new FailingAssertion(data));
            }
            break;
        case "TEST_END" /* TEST_END */:
            console.groupEnd();
            if (message.offset === 0) {
                console.assert(message.data.failureCount === 0, 'should not have any failure');
            }
            break;
        case "BAIL_OUT" /* BAIL_OUT */:
            throw message.data;
    }
};
export const reporter = async (stream) => {
    for await (const m of stream) {
        browserReporter(m);
    }
};
