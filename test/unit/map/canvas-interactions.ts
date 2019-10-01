import {factory as canvasInteraction, LONG_PRESS_TIME} from '../../../src/app/map/canvas-interactions';
import {Assert} from 'zora';
import {emitter} from 'smart-table-events';
import {stubFactory, wait} from '../utils';

const fakeSource = (): EventTarget => {
    const instance = emitter();

    //@ts-ignore
    instance.addEventListener = instance.on.bind(instance);

    //@ts-ignore
    return instance;
};

const onClickStub = stubFactory('onClick');
const onLongClickStub = stubFactory('onLongClick');

export default ({test}: Assert) => {
    test('mouse down/mouse up larger than threshold should result in a "long click" event ', async t => {
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
        source.dispatch('mousedown', {lngLat: point});
        await wait(1.5 * LONG_PRESS_TIME);
        // @ts-ignore
        source.dispatch('mouseup', {lngLat: point});
        t.ok(onClick.hasBeenCalled(0), 'click handler should not have been called');
        t.ok(onLongClick.hasBeenCalled(1), 'long click handler should have been called');
        t.eq(onLongClick.getCall(0), [{lngLat: point}], 'should have got point location as argument to the handler');
    });

    test('mouse down/mouse up shorter than threshold should result in a "click" event ', async t => {
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
        source.dispatch('mousedown', {lngLat: point});
        // @ts-ignore
        source.dispatch('mouseup', {lngLat: point});
        t.ok(onClick.hasBeenCalled(1), 'click handler should have been called');
        t.ok(onLongClick.hasBeenCalled(0), 'long click handler should not have been called');
        t.eq(onClick.getCall(0), [{lngLat: point}], 'should have got point location as argument to the handler');
    });

    test('mouse down/mouse up shorter than threshold should result in a "click" event ', async t => {
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