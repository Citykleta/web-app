import {AssertionMessage, AssertionResult, Message, MessageType, StartTestMessage, Test, TestHarness} from 'zora';

const isAssertionResult = (data: any) => data.actual && data.expected;

function FailingAssertion(data: AssertionResult) {
    this.actual = data.actual;
    this.expected = data.expected;
    this.description = data.description;
    this.location = data.at;
}

const browserReporter = (message: Message<any>) => {
    switch (message.type) {
        case MessageType.TEST_START:
            const m = <StartTestMessage>message;
            console.groupCollapsed(m.data.description);
            break;
        case MessageType.ASSERTION:
            const {data} = <AssertionMessage>message;
            console.assert(data.pass, `${data.description} should have passed`);
            if (!data.pass && isAssertionResult(data)) {
                console.dir(new FailingAssertion(<AssertionResult>data));
            }
            break;
        case  MessageType.TEST_END:
            console.groupEnd();
            if (message.offset === 0) {
                console.assert((<Test>message.data).failureCount === 0, 'should not have any failure');
            }
            break;
        case MessageType.BAIL_OUT:
            throw message.data;
    }
};

export const reporter = async (stream: TestHarness) => {
    for await (const m of stream) {
        browserReporter(m);
    }
};
