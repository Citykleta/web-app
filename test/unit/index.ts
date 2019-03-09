import {test, skip} from 'zora';
import toolAction from './actions/tool-box';
import itineraryAction from './actions/itinerary';
import itineraryReducer from './reducers/itinerary';
import toolBoxReducer from './reducers/tool-box';
import itineraryService from './services/itinerary';
import toolboxService from './services/tool-box';

test.indent();

test('ITINERARY ACTIONS', itineraryAction);
test('ITINERARY REDUCER', itineraryReducer);
skip('ITINERARY SERVICE', itineraryService);
test('TOOL_BOX ACTIONS', toolAction);
test('TOOL-BOX REDUCER', toolBoxReducer);
test('TOOL-BOX SERVICE', toolboxService);


