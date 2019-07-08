import {Reducer} from 'redux';
import {ActionType} from '../common/actions';
import {
    AddItineraryPointAction,
    FetchRoutesSuccessAction,
    GoToAction,
    InsertionPosition,
    RemoveItineraryPointAction,
    UpdateItineraryPointAction
} from './actions';
import {ItineraryPoint, Route} from '../utils';

export interface ItineraryState {
    stops: ItineraryPoint[];
    routes: Route[];
}

export const defaultState: ItineraryState = {
    stops: [{
        id: 0,
        item: null
    }, {
        id: 1,
        item: null
    }],
    routes: []
};

const matchId = id => item => item.id === id;

export const reducer: Reducer<ItineraryState> = (previousState = defaultState, action) => {
    switch (action.type) {
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
                stops: previousState.stops.map(p => p.id !== id ? p : {
                    id,
                    item: Object.assign({}, p.item, location)
                })
            });
        }
        case ActionType.ADD_ITINERARY_POINT: {
            const {beforeId, point} = <AddItineraryPointAction>action;
            const newStops = [...previousState.stops];
            const beforeIndex = newStops.findIndex(p => p.id === beforeId);
            const insertIndex = beforeIndex >= 0 ? beforeIndex : newStops.length;
            const id = newStops.reduce((acc, curr) => Math.max(curr.id, acc), -1) + 1;

            const newPoint = {id, item: null};

            if (point) {
                newPoint.item = point;
            }

            newStops.splice(insertIndex, 0, newPoint);

            return Object.assign({}, previousState, {
                stops: newStops
            });
        }
        case ActionType.MOVE_ITINERARY_POINT: {
            const {stops} = previousState;
            const newStops = [...stops];
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
        case ActionType.GO_TO: {
            const {location} = <GoToAction>action;
            return Object.assign({}, previousState, {
                stops: [{
                    id: 0,
                    item: null
                }, {
                    id: 1,
                    item: location
                }],
                routes: []
            });
        }
        case ActionType.GO_FROM: {
            const {location} = <GoToAction>action;
            return Object.assign({}, previousState, {
                stops: [{
                    id: 0,
                    item: location
                }, {
                    id: 1,
                    item: null
                }],
                routes: []
            });
        }
        default:
            return previousState;
    }
};
