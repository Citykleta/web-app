import {Action} from 'redux';
import {ActionType} from './types';
import {PointOfInterestSearchResult, SearchResult} from '../utils';
import {API} from '../services/store';

export interface FetchPointsOfInterestAction extends Action<ActionType.FETCH_POINTS_OF_INTEREST> {
    query: string;
}

export const fetchPointsOfInterest = (query: string): FetchPointsOfInterestAction => ({
    type: ActionType.FETCH_POINTS_OF_INTEREST,
    query
});

export interface FetchPointsOfInterestSuccessAction extends Action<ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS> {
    pointsOfInterest: PointOfInterestSearchResult[]
}

export const fetchPointsOfInterestWithSuccess = (pointsOfInterest: PointOfInterestSearchResult[]): FetchPointsOfInterestSuccessAction => ({
    type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
    pointsOfInterest
});

export interface FetchPointsOfInterestFailure extends Action<ActionType.FETCH_POINTS_OF_INTEREST_FAILURE> {
    error: any
}

export const fetchPointsOfInterestWithFailure = (error: any): FetchPointsOfInterestFailure => ({
    type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
    error
});

export const fetchPointsOfInterestFromAPI = (query: string) => async (dispatch, getState, API: API) => {
    const {geocoder} = API;
    dispatch(fetchPointsOfInterest(query));
    try {
        const res = await geocoder.searchPointsOfInterest(query);
        return dispatch(fetchPointsOfInterestWithSuccess(res));
    } catch (e) {
        return dispatch(fetchPointsOfInterestWithFailure(e));
    }
};

export interface FetchSearchResultAction extends Action<ActionType.FETCH_SEARCH_RESULT> {
    query: string;
}

export const fetchSearchResult = (query: string): FetchSearchResultAction => ({
    type: ActionType.FETCH_SEARCH_RESULT,
    query
});

export interface FetchSearchResultSuccessAction extends Action<ActionType.FETCH_SEARCH_RESULT_SUCCESS> {
    result: SearchResult[];
}

export const fetchSearchResultWithSuccess = (result: SearchResult[]): FetchSearchResultSuccessAction => ({
    type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
    result
});

export interface FetchSearchResultFailureAction extends Action<ActionType.FETCH_SEARCH_RESULT_FAILURE> {
    error: any;
}

export const fetchSearchResultWithFailure = (error: any): FetchSearchResultFailureAction => ({
    type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
    error
});

export const fetchSearchResultFromAPI = (query: string) => async (dispatch, getState, API: API) => {
    const {geocoder} = API;
    dispatch(fetchSearchResult(query));
    try {
        const res = await geocoder.searchAddress(query);
        return dispatch(fetchSearchResultWithSuccess(res));
    } catch (e) {
        return dispatch(fetchSearchResultWithFailure(e));
    }
};

export interface SelectSearchResultAction extends Action<ActionType.SELECT_SEARCH_RESULT> {
    searchResult: SearchResult
}

export const selectSearchResult = (result: SearchResult): SelectSearchResultAction => ({
    type: ActionType.SELECT_SEARCH_RESULT,
    searchResult: result
});
