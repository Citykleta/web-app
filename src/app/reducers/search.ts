import {Reducer} from 'redux';
import {ActionType} from '../actions/types';
import {GeoCoord} from '../tools/interfaces';

export interface Suggestion extends GeoCoord {
    id: number;
}

export interface SearchState {
    suggestions: Suggestion[];
    matchingItem: Suggestion;
}

const defaultState: SearchState = {
    suggestions: [],
    matchingItem: null
};

export const reducer: Reducer<SearchState> = (previousState = defaultState, action) => {
    switch (action.type) {
        default:
            return previousState;
    }
};
