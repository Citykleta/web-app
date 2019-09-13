import {combineReducers} from 'redux';
import {defaultState} from './store';
import {ActionType} from '../common/actions';

export const createReducer = (reducers) => {

    const combined = combineReducers(reducers);

    return (state = defaultState, action) => {

        if (action.type === ActionType.CHANGE_HISTORY_POINT) {
            return action.state;
        }

        return combined(state, action);
    };
};
