import {Reducer} from 'redux';
import {UIPoint} from '../utils';
import {ActionType} from '../actions/types';

// todo type search results
export interface SearchState {
    suggestions: UIPoint[];
    selectedSuggestion: UIPoint;
    searchResult: any[];
}

const defaultState: SearchState = {
    suggestions: [],
    searchResult: [],
    selectedSuggestion: null
};

export const reducer: Reducer<SearchState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.FETCH_SUGGESTIONS_SUCCESS:
            return Object.assign({}, previousState, {
                suggestions: action.suggestions.map((s, i) => Object.assign(s, {
                    id: i
                })),
                searchResult: [] // init
            });
        case ActionType.SELECT_SUGGESTION:
            const {suggestion} = action;
            return Object.assign({}, previousState, {
                selectedSuggestion: suggestion ? Object.assign({}, suggestion) : null
            });
        case ActionType.FETCH_SEARCH_RESULT_SUCCESS:
            const {result} = action;
            return Object.assign({}, previousState, {
                searchResult: result.map((s, i) => Object.assign(s, {
                    id: i
                })),
                // todo maybe this should be driven by global state
                suggestions: [], // init
                selectedSuggestion: null
            });
        default:
            return previousState;
    }
};
