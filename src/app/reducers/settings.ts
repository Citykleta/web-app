import {Reducer} from 'redux';
import {ActionType} from '../actions/types';

export enum Theme {
    LIGHT = 'LIGHT',
    DARK = 'DARK'
}

export interface SettingsState {
    theme: Theme
}

const defaultState: SettingsState = {
    theme: Theme.LIGHT
};

export const reducer: Reducer<SettingsState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.CHANGE_THEME:
            return Object.assign({}, previousState, {
                theme: action.theme
            });
        default:
            return previousState;
    }
};
