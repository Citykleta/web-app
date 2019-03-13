import {Reducer} from 'redux';
import {UIPoint} from '../util';

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
        default:
            return previousState;
    }
};
