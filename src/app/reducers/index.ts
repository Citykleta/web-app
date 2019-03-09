import {combineReducers} from 'redux';
import {reducer as toolBoxReducer} from './tool-box';
import {reducer as itineraryReducer} from './itinerary';

export default combineReducers({
    tool: toolBoxReducer,
    itinerary: itineraryReducer
})
