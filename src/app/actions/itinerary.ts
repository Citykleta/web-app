import {ActionType} from './types';
import {Action, ActionCreator} from 'redux';
import {ThunkAction} from 'redux-thunk';
import {API, ApplicationState} from '../services/store';
import {Route, GeoCoord} from '../util';

export interface AddItineraryPointAction extends Action<ActionType.ADD_ITINERARY_POINT> {
    point: GeoCoord,
    beforeId?: number
}

export const addItineraryPoint = (point: GeoCoord, beforeId: number = null): AddItineraryPointAction => ({
    type: ActionType.ADD_ITINERARY_POINT,
    point,
    beforeId
});

export interface RemoveItineraryPointAction extends Action<ActionType.REMOVE_ITINERARY_POINT> {
    id: number
}

export const removeItineraryPoint = (id: number): RemoveItineraryPointAction => ({
    type: ActionType.REMOVE_ITINERARY_POINT,
    id
});

export interface ChangeItineraryPointLocationAction extends Action<ActionType.CHANGE_ITINERARY_POINT_LOCATION> {
    id: number,
    location: GeoCoord
}

export const changeItineraryPointLocation = (id: number, location: GeoCoord): ChangeItineraryPointLocationAction => ({
    type: ActionType.CHANGE_ITINERARY_POINT_LOCATION,
    id,
    location
});

export interface FetchRoutesAction extends Action<ActionType.FETCH_ROUTES> {
    type: ActionType.FETCH_ROUTES
}

export const fetchRoutes = (): FetchRoutesAction => ({
    type: ActionType.FETCH_ROUTES
});

export interface FetchRoutesSuccessAction extends Action<ActionType.FETCH_ROUTES_SUCCESS> {
    type: ActionType.FETCH_ROUTES_SUCCESS,
    routes: Route[]
}

export const fetchRoutesWithSuccess = (routes: Route[]): FetchRoutesSuccessAction => ({
    type: ActionType.FETCH_ROUTES_SUCCESS,
    routes
});

export interface FetchRoutesFailureAction extends Action<ActionType.FETCH_ROUTES_FAILURE> {
    type: ActionType.FETCH_ROUTES_FAILURE,
    error: any // todo normalize error type
}

export const fetchRoutesWithFailure = (error: any): FetchRoutesFailureAction => ({
    type: ActionType.FETCH_ROUTES_FAILURE,
    error
});

export interface ResetRoutesAction extends Action<ActionType.RESET_ROUTES> {
    type: ActionType.RESET_ROUTES
}

export const resetRoutes = (): ResetRoutesAction => ({
    type: ActionType.RESET_ROUTES
});

type ItineraryStopsAction =
    AddItineraryPointAction |
    RemoveItineraryPointAction |
    ChangeItineraryPointLocationAction;

// thunks to handle side effects of stop points change
const eventuallyUpdateRoutes = <K extends ItineraryStopsAction>(actionCreator: ActionCreator<K>) =>
    (...args): ThunkAction<any, ApplicationState, API, K> => async (dispatch, getState) => {
        dispatch(actionCreator(...args));
        if (getState().itinerary.stops.length >= 2) {
            return dispatch(fetchRoutesFromAPI());
        }
    };

export enum InsertionPosition {
    BEFORE = 'BEFORE',
    AFTER = 'AFTER'
}

export const fetchRoutesFromAPI = () => async (dispatch, getState, API: API) => {
    const {directions} = API;
    dispatch(fetchRoutes());
    try {
        const res = await directions.search(getState().itinerary.stops);
        return dispatch(fetchRoutesWithSuccess(res));
    } catch (e) {
        return dispatch(fetchRoutesWithFailure(e));
    }
};

export interface MoveItineraryPointAction extends Action<ActionType.MOVE_ITINERARY_POINT> {
    sourceId: number;
    targetId: number;
    position: InsertionPosition;
}

export const moveItineraryPoint = (sourceId: number, targetId: number, position: InsertionPosition) => ({
    type: ActionType.MOVE_ITINERARY_POINT,
    sourceId,
    targetId,
    position
});

export const addItineraryPointWithSideEffects = eventuallyUpdateRoutes<AddItineraryPointAction>(addItineraryPoint);
export const removeItineraryPointWithSideEffects = eventuallyUpdateRoutes<RemoveItineraryPointAction>(removeItineraryPoint);
export const changeItineraryPointLocationWithSideEffects = eventuallyUpdateRoutes<ChangeItineraryPointLocationAction>(changeItineraryPointLocation);

//todo test
export const moveItineraryPointWithSideEffects = eventuallyUpdateRoutes<any>(moveItineraryPoint);
