import {ServiceRegistry} from '../common/service-registry';
import {provider} from './service';
import {NavigationBar} from './elements/navigation-bar';
import {once} from '../utils';

export * from './service';
export * from './reducer';
export * from './actions';
export {NavigationBar} from './elements/navigation-bar';

export const loadServices = once((registry: ServiceRegistry, store) => {
    // todo register reducer
    registry.set('navigation', provider(store));
});

export const loadComponents = once((injector) => {
    customElements.define('citykleta-navigation-bar', injector(NavigationBar));
});

