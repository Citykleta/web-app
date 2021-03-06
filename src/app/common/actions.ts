import {ApplicationState} from '../store/store';
import {Action} from 'redux';

export enum ActionType {
    MOVE_ITINERARY_POINT = 'MOVE_ITINERARY_POINT',
    ADD_ITINERARY_POINT = 'ADD_ITINERARY_POINT',
    UPDATE_ITINERARY_POINT = 'UPDATE_ITINERARY_POINT',
    REMOVE_ITINERARY_POINT = 'REMOVE_ITINERARY_POINT',
    GO_TO = 'GO_TO',
    GO_FROM = 'GO_FROM',
    FETCH_ROUTES = 'FETCH_ROUTES',
    FETCH_ROUTES_SUCCESS = 'FETCH_ROUTES_SUCCESS',
    FETCH_ROUTES_FAILURE = 'FETCH_ROUTES_FAILURE',
    SELECT_ROUTE = 'SELECT_ROUTE',
    RESET_ROUTES = 'RESET_ROUTES',
    FETCH_POINTS_OF_INTEREST = 'FETCH_POINTS_OF_INTEREST',
    FETCH_POINTS_OF_INTEREST_SUCCESS = 'FETCH_POINTS_OF_INTEREST_SUCCESS',
    FETCH_POINTS_OF_INTEREST_FAILURE = 'FETCH_POINTS_OF_INTEREST_FAILURE',
    FETCH_SEARCH_RESULT = 'FETCH_SEARCH_RESULT',
    FETCH_SEARCH_RESULT_SUCCESS = 'FETCH_SEARCH_RESULT_SUCCESS',
    FETCH_SEARCH_RESULT_FAILURE = 'FETCH_SEARCH_RESULT_FAILURE',
    FETCH_CLOSEST = 'FETCH_CLOSEST',
    FETCH_CLOSEST_SUCCESS = 'FETCH_CLOSEST_SUCCESS',
    FETCH_CLOSEST_FAILURE = 'FETCH_CLOSEST_FAILURE',
    FETCH_LEISURE_ROUTES = 'FETCH_LEISURE_ROUTES',
    FETCH_LEISURE_ROUTES_SUCCESS = 'FETCH_LEISURE_ROUTES_SUCCESS',
    FETCH_LEISURE_ROUTES_FAILURE = 'FETCH_LEISURE_ROUTES_FAILURE',
    SELECT_LEISURE_ROUTE = 'SELECT_LEISURE_ROUTE',
    SELECT_SEARCH_RESULT = 'SELECT_SEARCH_RESULT',
    SELECT_LEISURE_STOP = 'SELECT_LEISURE_STOP',
    CHANGE_THEME = 'CHANGE_THEME',
    UPDATE_MAP = 'UPDATE_MAP',
    SELECT_VIEW = 'SELECT_VIEW',
    CHANGE_HISTORY_POINT = 'CHANGE_HISTORY_POINT'
}

export interface ChangeHistoryPointAction extends Action<ActionType.CHANGE_HISTORY_POINT> {
    state: ApplicationState
}

export const changeHistoryPoint = (state: ApplicationState): ChangeHistoryPointAction => ({
    type: ActionType.CHANGE_HISTORY_POINT,
    state
});
