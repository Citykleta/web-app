import {emitter} from 'smart-table-events';
import {ToolType, GeoCoord} from '../tools/interfaces';
import {Emitter} from 'smart-table-events';
import {Directions} from '../sdk/directions';
import {unique} from '../util';

// 1. todo store should be in charge of reporting errors
// 2. todo store should be able to cancel network request
// 3. todo idea for refactoring, use aspect programming on state to trigger event dispatch

export interface WayPoint extends GeoCoord {
    id: number;
}

export interface Store extends Emitter {
    selectTool(tool: ToolType | null): void;

    getState(): ApplicationState;

    addItineraryPoint(point: GeoCoord, beforeId ?: number): void;

    removeItineraryPoint(id: number): void;

    moveItineraryPoint(id: number, newCoord: GeoCoord): void;
}

export enum Events {
    TOOL_CHANGED = 'TOOL_CHANGED',
    ITINERARY_STOPS_CHANGED = 'ITINERARY_STOPS_CHANGED',
    ITINERARY_ROUTES_CHANGED = 'ITINERARY_ROUTES_CHANGED'
}

export interface ToolSelectionState {
    selectedTool: ToolType | null;
}

export interface ItineraryState {
    stops: WayPoint[],
    routes: any[]
}

export interface ApplicationState {
    tool: ToolSelectionState;
    itinerary: ItineraryState;
}

export const defaultState = (): ApplicationState => {
    return {
        tool: {
            selectedTool: null
        },
        itinerary: {
            stops: [],
            routes: []
        }
    };
};

interface StoreInput {
    directions: Directions
}

const DISPATCH_THROTTLE_TIME = 30;

const getPartialState = (state: ApplicationState, event: Events) => {
    switch (event) {
        case Events.ITINERARY_STOPS_CHANGED:
            return state.itinerary;
        case Events.ITINERARY_ROUTES_CHANGED:
            return state.itinerary;
        case Events.TOOL_CHANGED:
            return state.tool;
        default:
            return state;
    }
};

export const provider = (input: StoreInput): Store => {
    const eventEmitter = emitter();
    const {directions: directionAPI} = input;

    let state: ApplicationState = defaultState();
    let pointId = 0;

    const cloneState = (): ApplicationState => JSON.parse(JSON.stringify(state));

    const eventuallyUpdateRoutes = () => {
        const {itinerary} = state;
        if (itinerary.stops.length >= 2) {
            directionAPI.search(itinerary.stops)
                .then(resp => {
                    state.itinerary.routes = resp.routes;
                    eventEmitter.dispatch(Events.ITINERARY_ROUTES_CHANGED, cloneState().itinerary);
                });
        } else {
            state.itinerary.routes = [];
            eventEmitter.dispatch(Events.ITINERARY_ROUTES_CHANGED, cloneState().itinerary);
        }
    };

    // buffer events to avoid to dispatch on transitory state changes
    let dispatchQueue: Events[] = [];
    let dispatchTimer = null;
    const dispatch = (event: Events) => {
        eventEmitter.dispatch(event, getPartialState(cloneState(), event));
        dispatchQueue.push(event);
        if (dispatchTimer) {
            clearTimeout(dispatchTimer);
        }
        dispatchTimer = setTimeout(() => {
            const toDispatch = unique<Events>(dispatchQueue);
            const newState = cloneState();
            for (const ev of toDispatch) {
                console.log(`EVENT ${ev}`);
                eventEmitter.dispatch(ev, getPartialState(newState, ev));
            }
            dispatchQueue = [];
        }, DISPATCH_THROTTLE_TIME);
    };

    eventEmitter.on(Events.ITINERARY_STOPS_CHANGED, eventuallyUpdateRoutes);

    return Object.assign(eventEmitter, {
        selectTool(tool: ToolType | null) {
            state.tool.selectedTool = tool;
            state.itinerary.stops = [];
            state.itinerary.routes = [];
            const {itinerary} = this.getState();
            dispatch(Events.ITINERARY_STOPS_CHANGED);
            dispatch(Events.ITINERARY_ROUTES_CHANGED);
            dispatch(Events.TOOL_CHANGED);
        },
        addItineraryPoint(point: GeoCoord, beforeId?: number) {
            const stops = state.itinerary.stops;
            const insertIndex = beforeId !== void 0 ? stops.findIndex(wp => wp.id === beforeId) : stops.length;
            stops.splice(insertIndex, 0, {
                lat: point.lat,
                lng: point.lng,
                id: pointId++
            });
            dispatch(Events.ITINERARY_STOPS_CHANGED);
        },
        removeItineraryPoint(id: number) {
            const wayPoints = state.itinerary.stops;
            const index = wayPoints.findIndex(p => p.id === id);
            wayPoints.splice(index, 1);
            dispatch(Events.ITINERARY_STOPS_CHANGED);
        },
        moveItineraryPoint(id: number, newCoord: GeoCoord) {
            const wp = state.itinerary.stops.find(p => p.id === id);
            Object.assign(wp, newCoord);
            dispatch(Events.ITINERARY_STOPS_CHANGED);
        },
        getState: cloneState
    });
};
