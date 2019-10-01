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
    selectedRouteId: number
}

export const defaultState = (): LeisureState => ({
    routes: [],
    isSearching: false,
    selectedRouteId: null
});

export const reducer: Reducer<LeisureState> = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.FETCH_LEISURE_ROUTES:
            return {
                isSearching: true,
                routes: [],
                selectedRouteId: null
            };
        case ActionType.FETCH_LEISURE_ROUTES_SUCCESS: {
            return {
                routes: action.result,
                isSearching: false,
                selectedRouteId: action.result.length > 0 ? action.result[0].id : null
            };
        }
        case ActionType.FETCH_LEISURE_ROUTES_FAILURE:
            return Object.assign({}, previousState, {isSearching: false});
        case ActionType.SELECT_LEISURE_ROUTE: {
            const selectedRouteId = previousState.routes.some(r => r.id === action.routeId) ? action.routeId : previousState.selectedRouteId;
            return Object.assign({}, previousState, {selectedRouteId});
        }
        default:
            return previousState;
    }
};