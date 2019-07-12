import {createHarness} from 'zora';
import itineraryAction from './itinerary/actions';
import itineraryReducer from './itinerary/reducer';
import settingsAction from './settings/actions';
import settingsReducer from './settings/reducer';
import searchAction from './search/actions';
import searchReducer from './search/reducer';
import mapUtil from './map/utils';
import searchService from './search/service';
import itineraryService from './itinerary/service';
import searchResultElement from './search/elements/search-result';
import navigationActions from './navigation/actions';
import navigationService from './navigation/service';
import navigationReducer from './navigation/reducer';
import commonActions from './common/actions';
import mapActions from './map/actions';
import mapReducer from './map/reducer';
import urlStorage from './storage/url';

import {reporter} from './browser-reporter';

const harness = createHarness();
const {test} = harness;

test('ITINERARY ACTIONS', itineraryAction);
test('ITINERARY REDUCER', itineraryReducer);
test('ITINERARY SERVICE', itineraryService);
test('SEARCH ACTIONS', searchAction);
test('SEARCH REDUCER', searchReducer);
test('SEARCH SERVICE', searchService);
test('SETTINGS ACTIONS', settingsAction);
test('SETTINGS REDUCER', settingsReducer);
test('NAVIGATION ACTIONS', navigationActions);
test('NAVIGATION REDUCER', navigationReducer);
test('NAVIGATION SERVICE', navigationService);
test('MAP UTILS', mapUtil);
test('MAP ACTIONS', mapActions);
test('MAP REDUCER', mapReducer);
test('SEARCH-RESULT ELEMENTS', searchResultElement);
test('COMMON ACTIONS', commonActions);
test('URL STORAGE', urlStorage);

harness
    .report(reporter);




