import {ApplicationState} from '../services/store';
import {UIPoint} from '../utils';

export const id = 'suggestions';

export const style = {
    id,
    type: 'circle',
    source: id,
    paint: {
        ['circle-color']: 'red'
    }
};

export const slice = (state:ApplicationState): UIPoint[] => state.search.suggestions;
