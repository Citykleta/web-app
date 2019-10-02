import {PointOfInterestSearchResult, Route} from '../utils';
import {Reducer} from 'redux';
import {ActionType} from '../common/actions';

// todo improve type definition
export interface LeisureRoute extends Route {
    id: number;
    title: string;
    description: string;
    stops: PointOfInterestSearchResult[]
}

export interface LeisureState {
    isSearching: boolean;
    routes: LeisureRoute[];
    selectedRouteId: number;
    selectedStopIndex: number;
}

export const defaultState = (): LeisureState => ({
    routes: [],
    isSearching: false,
    selectedRouteId: null,
    selectedStopIndex: null
});

export const reducer: Reducer<LeisureState> = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.FETCH_LEISURE_ROUTES:
            return {
                isSearching: true,
                routes: [],
                selectedRouteId: null,
                selectedStopIndex: null
            };
        case ActionType.FETCH_LEISURE_ROUTES_SUCCESS: {
            return {
                routes: action.result,
                isSearching: false,
                selectedRouteId: action.result.length > 0 ? action.result[0].id : null,
                selectedStopIndex: action.result.length > 0 ? 0 : null
            };
        }
        case ActionType.FETCH_LEISURE_ROUTES_FAILURE:
            return Object.assign({}, previousState, {isSearching: false});
        case ActionType.SELECT_LEISURE_ROUTE: {
            const selectedRouteId = previousState.routes.some(r => r.id === action.routeId) ? action.routeId : previousState.selectedRouteId;
            return Object.assign({}, previousState, {selectedRouteId, selectedLeisureStop: 0});
        }
        case ActionType.SELECT_LEISURE_STOP: {
            const {selectedRouteId, routes} = previousState;
            const selectedRoute = routes.find(r => r.id === selectedRouteId);
            if (selectedRoute && selectedRoute.stops.length > action.stopIndex) {
                return Object.assign({}, previousState, {
                    selectedStopIndex: action.stopIndex
                });
            }

            return previousState;
        }
        default:
            return previousState;
    }
};