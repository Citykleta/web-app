import {GeoCoord} from '../tools/interfaces';
import {Reducer} from 'redux';
import {ActionType} from '../actions/types';
import {
    AddItineraryPointAction,
    ChangeItineraryPointLocationAction,
    RemoveItineraryPointAction
} from '../actions/itinerary';

export interface WayPoint extends GeoCoord {
    id: number;
}

export interface ItineraryState {
    stops: WayPoint[];
    routes: any[]; //todo formalize routes state
}

const defaultState: ItineraryState = {
    stops: [],
    routes: []
};

export const reducer: Reducer<ItineraryState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.CHANGE_ITINERARY_POINT_LOCATION: {
            const {id, location} = <ChangeItineraryPointLocationAction>action;
            return Object.assign({}, previousState, {
                stops: previousState.stops.map(p => p.id !== id ? p : Object.assign({}, p, location))
            });
        }
        case ActionType.ADD_ITINERARY_POINT: {
            const {beforeId, point} = <AddItineraryPointAction>action;
            const newStops = [...previousState.stops];
            const beforeIndex = newStops.findIndex(p => p.id === beforeId);
            const insertIndex = beforeIndex >= 0 ? beforeIndex : newStops.length;

            newStops.splice(insertIndex, 0, point);

            return Object.assign({}, previousState, {
                stops: newStops
            });
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
