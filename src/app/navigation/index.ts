import {loadComponents, loadServices} from './module';

export default (registry, injector, store) => {
    loadServices(registry, store);
    loadComponents(injector);
}
