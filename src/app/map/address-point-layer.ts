import {isGeoCoord, UIPoint} from '../utils';
import {ApplicationState} from '../services/store';

export const id = 'address-point';

export const style = {
    id,
    type: 'circle',
    source: id,
    paint: {
        ['circle-color']: 'purple'
    }
};

export const slicer = (state: ApplicationState): UIPoint[] => <UIPoint[]>state.itinerary.stops
    .filter(isGeoCoord);
