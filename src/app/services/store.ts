import {emitter} from 'smart-table-events';
import {ToolType, Point} from '../tools/interfaces';
import {Emitter} from 'smart-table-events';
import {Directions} from '../sdk/directions';

// 1. todo store should be in charge of reporting errors
// 2. todo store should be able to cancel network request
// 3. todo idea for refactoring, use aspect programming on state to trigger event dispatch

export interface Store extends Emitter {
    selectTool(tool: ToolType | null): void;

    getState(): ApplicationState;

    addItineraryPoint(point: Point, index ?: number): void;

    removeItineraryPoint(index: number): void;

    moveItineraryPoint(index: number, point: Point): void;
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
    stops: Point[],
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

export const provider = (input: StoreInput): Store => {
    const eventEmitter = emitter();
    const {directions: directionAPI} = input;
    let state: ApplicationState = defaultState();

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

    return Object.assign(eventEmitter, {
        selectTool(tool: ToolType | null) {
            state.tool.selectedTool = tool;
            //todo where should the reset be ?
            state.itinerary.stops = [];
            state.itinerary.routes = [];
            const {itinerary} = this.getState();
            eventEmitter.dispatch(Events.ITINERARY_STOPS_CHANGED, itinerary);
            eventEmitter.dispatch(Events.ITINERARY_ROUTES_CHANGED, itinerary);
            eventEmitter.dispatch(Events.TOOL_CHANGED, this.getState().tool);
        },
        addItineraryPoint(point: Point, index?: number) {
            const stops = state.itinerary.stops;
            const insertIndex = index !== void 0 ? index : stops.length;
            stops.splice(insertIndex, 0, point);
            eventEmitter.dispatch((Events.ITINERARY_STOPS_CHANGED), this.getState().itinerary);
            eventuallyUpdateRoutes();
        },
        removeItineraryPoint(index: number) {
            state.itinerary.stops.splice(index, 1);
            eventEmitter.dispatch(Events.ITINERARY_STOPS_CHANGED, this.getState().itinerary);
            eventuallyUpdateRoutes();
        },
        moveItineraryPoint(index: number, point: Point) {
            Object.assign(state.itinerary.stops[index], point);
            eventEmitter.dispatch(Events.ITINERARY_STOPS_CHANGED, this.getState().itinerary);
            eventuallyUpdateRoutes();
        },
        getState: cloneState
    });
};
