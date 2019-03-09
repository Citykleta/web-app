import {Reducer} from 'redux';
import {ActionType} from '../actions/types';

export interface SearchState {
    query?: string;
    suggestions: any[];
    selectedLocation: any;
}

const defaultState: SearchState = {
    query: '',
    suggestions: [],
    selectedLocation: null
};

export const reducer: Reducer<SearchState> = (previousState = defaultState, action) => {
    switch (action.type) {
        default:
            return previousState;
    }
};
