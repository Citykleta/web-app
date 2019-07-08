import {Reducer} from 'redux';
import {ActionType} from '../common/actions';

export enum View {
    SEARCH = 'SEARCH',
    SETTINGS = 'SETTINGS',
    ITINERARY = 'ITINERARY'
}

export interface NavigationState {
    selectedView: View
}

export const defaultState: NavigationState = {
    selectedView: View.SEARCH
};

export const reducer: Reducer<NavigationState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.SELECT_VIEW:
            return Object.assign({}, previousState, {selectedView: action.view});
        default:
            return previousState;
    }
};
