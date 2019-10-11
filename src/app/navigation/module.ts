import {Tab, TabPanel, TabSet} from '@citykleta/ui-kit';
import {ServiceRegistry} from '../common/service-registry';
import {provider} from './service';
import {once} from '../utils';
import {factory as lazyPanel} from './elements/lazy-panel';
import {View} from './reducer';
import {define} from '../common';

export * from './service';
export * from './reducer';
export * from './actions';

export const loadServices = once((registry: ServiceRegistry, store) => {
    registry.set('navigation', provider(store));
});

export const loadComponents = once((injector) => {
    define('citykleta-tabset', TabSet);
    define('citykleta-tab', Tab);
    define('citykleta-tabpanel', TabPanel);
    define('app-search-panel', lazyPanel(View.SEARCH));
    define('app-leisure-panel', lazyPanel(View.LEISURE));
    define('app-itinerary-panel', lazyPanel(View.ITINERARY));
    define('app-settings-panel', lazyPanel(View.SETTINGS));
});

