import {ActionType} from '../common/actions';
import {Action} from 'redux';
import {LeisureRoute} from './reducer';
import {API} from '../store/store';

export interface FetchLeisureRoutesAction extends Action<ActionType.FETCH_LEISURE_ROUTES> {

}

export const fetchLeisureRoutes = (): FetchLeisureRoutesAction => ({
    type: ActionType.FETCH_LEISURE_ROUTES
});

export interface FetchLeisureRoutesFailureAction extends Action<ActionType.FETCH_LEISURE_ROUTES_FAILURE> {
    error: any
}

export const fetchLeisureRoutesWithFailure = (error: any): FetchLeisureRoutesFailureAction => ({
    type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
    error
});

export interface FetchLeisureRoutesSuccessAction {
    type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
    result: LeisureRoute[]
}

export const fetchLeisureRoutesWithSuccess = (result: LeisureRoute[]): FetchLeisureRoutesSuccessAction => ({
    type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
    result
});

export const fetchLeisureRoutesFromAPI = () => async (dispatch, getState, API: API) => {
    const {leisure} = API;
    dispatch(fetchLeisureRoutes());
    try {
        const result = await leisure.searchRoutes();
        dispatch(fetchLeisureRoutesWithSuccess(result));
    } catch (e) {
        return dispatch(fetchLeisureRoutesWithFailure(e));
    }
};

export interface SelectLeisureRouteAction extends Action<ActionType.SELECT_LEISURE_ROUTE> {
    routeId: number
}

export const selectLeisureRoute = (routeId: number): SelectLeisureRouteAction => ({
    type: ActionType.SELECT_LEISURE_ROUTE,
    routeId
});

export interface SelectLeisureStopAction extends Action<ActionType.SELECT_LEISURE_STOP> {
    stopIndex: number
}

export const selectLeisureStop = (index: number): SelectLeisureStopAction => ({
    type: ActionType.SELECT_LEISURE_STOP,
    stopIndex: index
});