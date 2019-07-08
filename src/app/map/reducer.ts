import mapBoxConf from '../../conf/mapbox';
import {Reducer} from 'redux';
import {ActionType} from '../common/actions';

/*
 Note this reducer is only used to save the current map state into the application state.
 Only the map service should use it to synchronize the map state managed by Mapbox sdk with the app store.
 One should not expect map changes by soliciting this reducer and should go through the service which will act as proxy with mapbox sdk
 */

export interface MapState {
    center: number[],
    zoom: number,
};

export const defaultState = {
    zoom: mapBoxConf.zoom,
    center: mapBoxConf.center
};

export const reducer: Reducer<MapState> = (previousState = defaultState, action) => {
    switch (action.type) {
        case ActionType.UPDATE_MAP:
            const {type, ...rest} = action;
            return Object.assign({}, previousState, rest);
        default:
            return previousState;
    }
};


