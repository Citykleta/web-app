import {Assert} from 'zora';
import {View} from '../../../src/app/navigation/reducer';
import {factory} from '../../../src/app/map/tools/map-tool-box';
import {stubFactory} from '../utils';

export default function (a: Assert) {
    const clickActionFactory = stubFactory('clickAction');
    const longClickActionFactory = stubFactory('longClickAction');
    a.test('click action should trigger the current click action tool', t => {
        const toolBox = factory();
        const tool = clickActionFactory();
        toolBox.addTool(View.SEARCH, tool);
        toolBox.selectTool(View.SEARCH);
        //@ts-ignore
        toolBox.clickAction({lngLat: {lng: 333, lat: 444}});
        t.ok(tool.hasBeenCalled(1), 'the click action should have been called');
        t.eq(tool.getCall(0), [{lngLat: {lng: 333, lat: 444}}]);
    });

    a.test('click action should not trigger the current tool if it does not implement clickAction', t => {
        const toolBox = factory();
        const tool = longClickActionFactory();
        toolBox.addTool(View.SEARCH, tool);
        toolBox.selectTool(View.SEARCH);
        //@ts-ignore
        toolBox.clickAction({lngLat: {lng: 333, lat: 444}});
        t.ok(tool.hasBeenCalled(0), 'the tool should not have been called');
    });

    a.test('long click action should trigger the current long click action tool', t => {
        const toolBox = factory();
        const tool = longClickActionFactory();
        toolBox.addTool(View.SEARCH, tool);
        toolBox.selectTool(View.SEARCH);
        //@ts-ignore
        toolBox.longClickAction({lngLat: {lng: 333, lat: 444}});
        t.ok(tool.hasBeenCalled(1), 'the long click action should have been called');
        t.eq(tool.getCall(0), [{lngLat: {lng: 333, lat: 444}}]);
    });

    a.test('long click action should not trigger the current tool if it does not implement longClickAction', t => {
        const toolBox = factory();
        const tool = clickActionFactory();
        toolBox.addTool(View.SEARCH, tool);
        toolBox.selectTool(View.SEARCH);
        //@ts-ignore
        toolBox.longClickAction({lngLat: {lng: 333, lat: 444}});
        t.ok(tool.hasBeenCalled(0), 'the tool should not have been called');
    });
};