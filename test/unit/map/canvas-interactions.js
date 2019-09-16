import { factory as canvasInteraction, LONG_PRESS_TIME } from '../../../src/app/map/canvas-interactions';
import { emitter } from "smart-table-events";
import { stubFactory, wait } from "../utils";
const fakeSource = () => {
    //@ts-ignore
    return emitter();
};
const onClickStub = stubFactory('onClick');
const onLongClickStub = stubFactory('onLongClick');
export default ({ test }) => {
    test('mouse down/mouse up larger than threshold should result in a "long click" event ', async (t) => {
        const onClick = onClickStub();
        const onLongClick = onLongClickStub();
        const source = fakeSource();
        const canvas = canvasInteraction(source);
        // @ts-ignore
        canvas.onLongClick(onLongClick.onLongClick.bind(onLongClick));
        // @ts-ignore
        canvas.onClick(onClick.onClick.bind(onClick));
        const point = {
            lng: 333,
            lat: 444
        };
        // @ts-ignore
        source.dispatch('mousedown', { lngLat: point });
        await wait(1.5 * LONG_PRESS_TIME);
        // @ts-ignore
        source.dispatch('mouseup', { lngLat: point });
        t.ok(onClick.hasBeenCalled(0), 'click handler should not have been called');
        t.ok(onLongClick.hasBeenCalled(1), 'long click handler should have been called');
        t.eq(onLongClick.getCall(0), [{ lngLat: point }], 'should have got point location as argument to the handler');
    });
    test('mouse down/mouse up shorter than threshold should result in a "click" event ', async (t) => {
        const onClick = onClickStub();
        const onLongClick = onLongClickStub();
        const source = fakeSource();
        const canvas = canvasInteraction(source);
        // @ts-ignore
        canvas.onLongClick(onLongClick.onLongClick.bind(onLongClick));
        // @ts-ignore
        canvas.onClick(onClick.onClick.bind(onClick));
        const point = {
            lng: 333,
            lat: 444
        };
        // @ts-ignore
        source.dispatch('mousedown', { lngLat: point });
        await wait(0.5 * LONG_PRESS_TIME);
        // @ts-ignore
        source.dispatch('mouseup', { lngLat: point });
        t.ok(onClick.hasBeenCalled(1), 'click handler should have been called');
        t.ok(onLongClick.hasBeenCalled(0), 'long click handler should not have been called');
        t.eq(onClick.getCall(0), [{ lngLat: point }], 'should have got point location as argument to the handler');
    });
    test('mouse down/mouse up shorter than threshold should result in a "click" event ', async (t) => {
        const onClick = onClickStub();
        const onLongClick = onLongClickStub();
        const source = fakeSource();
        const canvas = canvasInteraction(source);
        // @ts-ignore
        canvas.onLongClick(onLongClick.onLongClick.bind(onLongClick));
        // @ts-ignore
        canvas.onClick(onClick.onClick.bind(onClick));
        // @ts-ignore
        source.dispatch('mousedown', {
            lngLat: {
                lng: 123,
                lat: 321
            }
        });
        await wait(0.5 * LONG_PRESS_TIME);
        // @ts-ignore
        source.dispatch('mouseup', {
            lngLat: {
                lng: 1234,
                lat: 4321
            }
        });
        t.ok(onClick.hasBeenCalled(0), 'click handler should not have been called');
        t.ok(onLongClick.hasBeenCalled(0), 'long click handler should not have been called');
    });
};
