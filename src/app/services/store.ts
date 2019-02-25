import {emitter} from 'smart-table-events';
import {ToolType, Point} from '../tools/interfaces';

export interface Store {
    selectTool(tool: ToolType | null): void;

    getState(): ApplicationState;

    addItineraryPoint(point: Point, index ?: number): void;

    removeItineraryPoint(index: number): void;

    moveItineraryPoint(index: number, point: Point): void;

    on(event: Events, cb: Function): void;
}

export enum Events {
    TOOL_CHANGED = 'TOOL_CHANGED',
    ITINERARY_STOP_CHANGED = 'ITINERARY_STOP_CHANGED'
}

export interface ToolSelectionState {
    selectedTool: ToolType | null;
}

export interface ItineraryState {
    stops: Point[],
    directions: any[]
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
            directions: []
        }
    };
};

export const provider = (): Store => {
    const eventEmitter = emitter();
    let state: ApplicationState = defaultState();
    return {
        selectTool(tool: ToolType | null) {
            state.tool.selectedTool = tool;
            //todo where should it be ?
            if (tool === null) {
                state.itinerary.stops = [];
                state.itinerary.directions = [];
                eventEmitter.dispatch(Events.ITINERARY_STOP_CHANGED, this.getState().itinerary);
            }
            eventEmitter.dispatch(Events.TOOL_CHANGED, this.getState().tool);
        },
        addItineraryPoint(point: Point, index?: number) {
            const stops = state.itinerary.stops;
            const insertIndex = index !== void 0 ? index : stops.length - 1;
            stops.splice(insertIndex, 0, point);
            eventEmitter.dispatch((Events.ITINERARY_STOP_CHANGED), this.getState().itinerary);
        },
        removeItineraryPoint(index: number) {
            state.itinerary.stops.splice(index, 1);
            eventEmitter.dispatch(Events.ITINERARY_STOP_CHANGED, this.getState().itinerary);
        },
        moveItineraryPoint(index: number, point: Point) {
            Object.assign(state.itinerary.stops[index], point);
            eventEmitter.dispatch(Events.ITINERARY_STOP_CHANGED, this.getState().itinerary);
        },
        on(event: Events, cb: Function) {
            eventEmitter.on(event, cb);
        },
        getState() {
            return JSON.parse(JSON.stringify(state));
        }
    };
};
