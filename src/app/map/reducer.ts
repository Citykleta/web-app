import mapBoxConf from '../../conf/mapbox';
import {Reducer} from 'redux';
import {ActionType} from '../common/actions';
import {truncate} from '../utils';

export interface MapState {
    center: number[],
    zoom: number,
}

export const defaultState = (): MapState => ({
    zoom: mapBoxConf.zoom,
    center: mapBoxConf.center
});

export const reducer: Reducer<MapState> = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.UPDATE_MAP:
            const {type, ...rest} = action;
            const newState = Object.assign({}, previousState, rest);
            newState.zoom = truncate(newState.zoom, 2);
            newState.center = newState.center.map(v => truncate(v, 6));
            return newState;
        default:
            return previousState;
    }
};


