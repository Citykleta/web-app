import {Evented, LngLat, MapMouseEvent} from "mapbox-gl";
import {emitter, proxyListener} from 'smart-table-events';

export interface CanvasInteractions {
    onClick(ev: MapMouseEvent): void;

    onLongClick(ev: MapMouseEvent): void;
}

const LONG_PRESS_TIME = 300;

const enum CanvasEvent {
    CLICK_EVENT = "CLICK_EVENT",
    LONG_CLICK_EVENT = "LONG_CLICK_EVENT"
}

const isSameLocation = (pos1: LngLat, pos2: LngLat) => {
    return pos1.lat === pos2.lat && pos1.lng === pos2.lng;
};

export const factory = (source: Evented): CanvasInteractions => {
    let mouseDownTime = null;
    let mouseDownPosition = null;

    const proxy = emitter();
    const proxyFactory = proxyListener({
        [CanvasEvent.CLICK_EVENT]: 'onClick',
        [CanvasEvent.LONG_CLICK_EVENT]: 'onLongClick'
    });

    //@ts-ignore
    const instance: CanvasInteractions = <CanvasInteractions>proxyFactory({emitter: proxy});

    source.on('mousedown', ev => {
        mouseDownTime = Date.now();
        mouseDownPosition = ev.lngLat;
    });

    source.on('mouseup', ev => {
        try {
            const mouseUpTime = Date.now();
            if (isSameLocation(mouseDownPosition, ev.lngLat)) {
                const eventName = (mouseUpTime - mouseDownTime) < LONG_PRESS_TIME ? CanvasEvent.CLICK_EVENT :
                    CanvasEvent.LONG_CLICK_EVENT;
                proxy.dispatch(eventName, ev);
            }
        } catch (e) {
            console.error(e);
        } finally {
            mouseDownTime = null;
            mouseDownPosition = null;
        }
    });

    return instance;
};