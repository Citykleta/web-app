import { View } from '../../../src/app/navigation/reducer';
import { factory } from '../../../src/app/map/tools/map-tool-box';
import { stubFactory } from '../utils';
const fakeStore = (state = {
    navigation: {
        selectedView: View.SEARCH
    }
}) => {
    let list = null;
    return {
        getState() {
            return JSON.parse(JSON.stringify(state));
        },
        subscribe(listener) {
            list = listener;
        },
        dispatch() {
            list(state);
        }
    };
};
export default function (a) {
    a.test('click action should trigger the current click action tool', t => {
        const store = fakeStore();
        //@ts-ignore
        const toolBox = factory(store);
        const tool = stubFactory('clickAction')();
        //@ts-ignore
        toolBox.addTool(View.SEARCH, tool);
        store.dispatch();
        //@ts-ignore
        toolBox.clickAction({ lngLat: { lng: 333, lat: 444 } });
        //@ts-ignore
        t.ok(tool.hasBeenCalled(1), 'the click action should have been called');
        //@ts-ignore
        t.eq(tool.getCall(0), [{ lngLat: { lng: 333, lat: 444 } }]);
    });
    a.test('click action should not trigger the current tool if it does not implement clickAction', t => {
        const store = fakeStore();
        //@ts-ignore
        const toolBox = factory(store);
        const tool = stubFactory('longClickAction')();
        //@ts-ignore
        toolBox.addTool(View.SEARCH, tool);
        store.dispatch();
        //@ts-ignore
        toolBox.clickAction({ lngLat: { lng: 333, lat: 444 } });
        //@ts-ignore
        t.ok(tool.hasBeenCalled(0), 'the tool should not have been called');
    });
    a.test('long click action should trigger the current long click action tool', t => {
        const store = fakeStore();
        //@ts-ignore
        const toolBox = factory(store);
        const tool = stubFactory('longClickAction')();
        //@ts-ignore
        toolBox.addTool(View.SEARCH, tool);
        store.dispatch();
        //@ts-ignore
        toolBox.longClickAction({ lngLat: { lng: 333, lat: 444 } });
        //@ts-ignore
        t.ok(tool.hasBeenCalled(1), 'the long click action should have been called');
        //@ts-ignore
        t.eq(tool.getCall(0), [{ lngLat: { lng: 333, lat: 444 } }]);
    });
    a.test('long click action should not trigger the current tool if it does not implement longClickAction', t => {
        const store = fakeStore();
        //@ts-ignore
        const toolBox = factory(store);
        const tool = stubFactory('clickAction')();
        //@ts-ignore
        toolBox.addTool(View.SEARCH, tool);
        store.dispatch();
        //@ts-ignore
        toolBox.longClickAction({ lngLat: { lng: 333, lat: 444 } });
        //@ts-ignore
        t.ok(tool.hasBeenCalled(0), 'the tool should not have been called');
    });
}
;
