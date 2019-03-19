import {Reducer} from 'redux';
import {ActionType} from '../actions/types';
import {
    AddItineraryPointAction, UpdateItineraryPointAction, FetchRoutesSuccessAction,
    RemoveItineraryPointAction, InsertionPosition
} from '../actions/itinerary';
import {Route, StatePoint, truncate, UIPoint} from '../util';

export type UIPointOrPlaceholder = UIPoint | StatePoint;

export interface ItineraryState {
    focus: number;
    stops: UIPointOrPlaceholder[];
    routes: Route[];
}

const defaultState: ItineraryState = {
    focus: null,
    stops: [{
        id: 0
    }, {
        id: 1
    }],
    routes: []
};

const matchId = id => item => item.id === id;

export const reducer: Reducer<ItineraryState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.FOCUS_ITINERARY_POINT: {
            return Object.assign(previousState, {
                focus: action.id
            });
        }
        case ActionType.RESET_ROUTES: {
            return Object.assign({}, defaultState);
        }
        case ActionType.FETCH_ROUTES_SUCCESS: {
            const {routes} = <FetchRoutesSuccessAction>action;
            return Object.assign({}, previousState, {
                routes
            });
        }
        case ActionType.UPDATE_ITINERARY_POINT: {
            const {id, location} = <UpdateItineraryPointAction>action;
            return Object.assign({}, previousState, {
                stops: previousState.stops.map(p => p.id !== id ? p : Object.assign({}, p, location))
            });
        }
        case ActionType.ADD_ITINERARY_POINT: {
            const {beforeId, point} = <AddItineraryPointAction>action;
            const newStops = [...previousState.stops];
            const beforeIndex = newStops.findIndex(p => p.id === beforeId);
            const insertIndex = beforeIndex >= 0 ? beforeIndex : newStops.length;
            const id = newStops.reduce((acc, curr) => Math.max(curr.id, acc), -1) + 1;

            newStops.splice(insertIndex, 0, Object.assign({id}, {
                lng: truncate(point.lng),
                lat: truncate(point.lat)
            }));

            return Object.assign({}, previousState, {
                stops: newStops
            });
        }
        case ActionType.MOVE_ITINERARY_POINT: {
            const {stops} = previousState;
            const newStops = stops.map(s => Object.assign({}, s));
            const {sourceId, targetId, position} = action;
            const sourceItem = newStops.find(matchId(sourceId));
            const targetItem = newStops.find(matchId(targetId));
            if (sourceItem && targetItem) {
                const targetIndex = position === InsertionPosition.BEFORE ? newStops.indexOf(targetItem) : newStops.indexOf((targetItem)) + 1;
                newStops.splice(targetIndex, 0, Object.assign({}, sourceItem));
                const srcIndex = newStops.indexOf(sourceItem);
                newStops.splice(srcIndex, 1);
            }
            return Object.assign(previousState, {stops: newStops});
        }
        case ActionType.REMOVE_ITINERARY_POINT: {
            const {id} = <RemoveItineraryPointAction>action;
            return Object.assign({}, previousState, {
                stops: previousState.stops.reduce((prev, curr) => prev.concat(curr.id !== id ? [curr] : []), [])
            });
        }
        default:
            return previousState;
    }
};
