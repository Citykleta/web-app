import {combineReducers} from 'redux';
import {reducer as toolBoxReducer} from './tool-box';
import {reducer as itineraryReducer} from './itinerary';
import {reducer as settingsReducer} from './settings';

export default combineReducers({
    tool: toolBoxReducer,
    itinerary: itineraryReducer,
    settings: settingsReducer
});
