import {Action} from 'redux';
import {ActionType} from './types';
import {GeoLocation} from '../util';
import {API} from '../services/store';

export interface FetchSuggestionsAction extends Action<ActionType.FETCH_SUGGESTIONS> {
    query: string
}

export const fetchSuggestions = (query: string): FetchSuggestionsAction => ({
    type: ActionType.FETCH_SUGGESTIONS,
    query
});

export interface FetchSuggestionsSuccessAction extends Action<ActionType.FETCH_SUGGESTIONS_SUCCESS> {
    suggestions: GeoLocation[]
}

export const fetchSuggestionsWithSuccess = (suggestions: GeoLocation[]): FetchSuggestionsSuccessAction => ({
    type: ActionType.FETCH_SUGGESTIONS_SUCCESS,
    suggestions
});

export interface FetchSuggestionsFailureAction extends Action<ActionType.FETCH_SUGGESTIONS_FAILURE> {
    error: any
}

export const fetchSuggestionsWithFailure = (error: any): FetchSuggestionsFailureAction => ({
    type: ActionType.FETCH_SUGGESTIONS_FAILURE,
    error
});

export const fetchSuggestionsFromAPI = (query: string) => async (dispatch, getState, API: API) => {
    const {geocoder} = API;
    dispatch(fetchSuggestions(query));
    try {
        const res = await geocoder.search(query);
        return dispatch(fetchSuggestionsWithSuccess(res));
    } catch (e) {
        return dispatch(fetchSuggestionsWithFailure(e));
    }
};

export interface SelectSuggestionAction extends Action<ActionType.SELECT_SUGGESTION> {
    suggestion: GeoLocation;
}

export const selectSuggestion = (suggestion: GeoLocation): SelectSuggestionAction => ({
    type: ActionType.SELECT_SUGGESTION,
    suggestion
});
