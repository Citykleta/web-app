import {Reducer} from 'redux';
import {UIPoint} from '../util';
import {ActionType} from '../actions/types';

export interface SearchState {
    suggestions: UIPoint[];
    selectedSuggestion: UIPoint;
}

const defaultState: SearchState = {
    suggestions: [],
    selectedSuggestion: null
};

export const reducer: Reducer<SearchState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.FETCH_SUGGESTIONS_SUCCESS:
            return Object.assign({}, previousState, {
                suggestions: action.suggestions.map((s, i) => Object.assign(s, {
                    id: i
                }))
            });
        case ActionType.SELECT_SUGGESTION:
            const {suggestion} = action;
            return Object.assign({}, previousState, {
                selectedSuggestion: suggestion ? Object.assign({}, suggestion) : null
            });
        default:
            return previousState;
    }
};
