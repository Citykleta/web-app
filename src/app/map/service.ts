import {MapPosition, updateMapPosition} from './actions';
import {ApplicationState} from '../store/store';
import {Store} from 'redux';

export interface MapService {
    updateCamera(state: MapPosition): void
}

const mapActions = {
    updateMapPosition: updateMapPosition
};

export const provider = (store: Store<ApplicationState>, {
    updateMapPosition
} = mapActions): MapService => {
    return {
        updateCamera(state: MapPosition): void {
            store.dispatch(updateMapPosition(state));
        }
    };
};