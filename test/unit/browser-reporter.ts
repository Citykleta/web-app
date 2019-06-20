import {AssertionMessage, AssertionResult, MessageType, Test, TestHarness} from 'zora';

const isAssertionResult = (data: any) => data.actual !== void 0 && data.expected !== void 0;

function FailingAssertion(data: AssertionResult) {
    this.description = data.description;
    this.actual = data.actual;
    this.expected = data.expected;
}

export const reporter = async (stream: TestHarness) => {

    const stack = [];

    for await (const message of stream) {
        switch (message.type) {
            case MessageType.TEST_START:
                stack.push(message);
                break;
            case MessageType.ASSERTION:
                const {data} = <AssertionMessage>message;
                if (!data.pass) {
                    if (isAssertionResult(data)) {
                        for (const t of stack) {
                            console.group(t.data.description);
                        }
                        const assertionData = <AssertionResult>data;
                        console.dir(new FailingAssertion(assertionData));
                        console.log(assertionData.at);
                        for (const t of stack) {
                            console.groupEnd();
                        }
                    }
                }
                break;
            case  MessageType.TEST_END: {
                if (message.offset === 0) {
                    const data = <Test>(message.data);
                    console.log(`${data.failureCount} failure(s)`);
                    console.log(`${data.successCount} successes(s)`);
                    console.log(`${data.skipCount} skip(s)`);
                    console.assert(data.failureCount === 0, 'should not have any failing test');
                }
                stack.pop();
                break;
            }
            case MessageType.BAIL_OUT:
                throw message.data;
        }
    }
};
