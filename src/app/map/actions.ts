import {Action} from 'redux';
import {ActionType} from '../common/actions';

export interface UpdateMapPositionAction extends Action<ActionType.UPDATE_MAP> {
    zoom: number;
    center: number[]
}

export interface MapPosition {
    center?: number[];
    zoom?: number;
}

export const updateMapPosition = (position: MapPosition): UpdateMapPositionAction => {
    const newPosition = <UpdateMapPositionAction>{
        type: ActionType.UPDATE_MAP
    };

    if (position.center !== void 0) {
        newPosition.center = position.center;
    }

    if (position.zoom !== void 0) {
        newPosition.zoom = position.zoom;
    }

    return newPosition;
};
