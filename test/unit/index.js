import { test } from 'zora';
import toolAction from './actions/tool-box';
import itineraryAction from './actions/itinerary';
import itineraryReducer from './reducers/itinerary';
import toolBoxReducer from './reducers/tool-box';
test.indent();
test('TOOL_BOX ACTIONS', t => {
    toolAction(t);
});
test('ITINERARY ACTIONS', t => {
    itineraryAction(t);
});
test('TOOL-BOX REDUCER', t => {
    toolBoxReducer(t);
});
test('ITINERARY REDUCER', t => {
    itineraryReducer(t);
});
