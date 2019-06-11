import {createHarness} from 'zora';
import toolAction from './actions/tool-box';
import toolBoxReducer from './reducers/tool-box';
import toolboxService from './services/tool-box';
// import itineraryAction from './actions/itinerary';
import itineraryReducer from './reducers/itinerary';
import settingsAction from './actions/settings';
import settingsReducer from './reducers/settings';
// import searchAction from './actions/search';
import searchReducer from './reducers/search';
import mapUtil from './map/utils';
import {reporter as browserReporter} from './browser-reporter';

const harness = createHarness();
const {test} = harness;

// test('ITINERARY ACTIONS', itineraryAction);
test('ITINERARY REDUCER', itineraryReducer);
// test('SEARCH ACTIONS', searchAction);
test('SEARCH REDUCER', searchReducer);
test('TOOL-BOX ACTIONS', toolAction);
test('TOOL-BOX REDUCER', toolBoxReducer);
test('TOOL-BOX SERVICE', toolboxService);
test('SETTINGS ACTIONS', settingsAction);
test('SETTINGS REDUCER', settingsReducer);
test('MAP UTILS', mapUtil);

harness
    .report(browserReporter);




