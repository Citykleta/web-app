import {loadComponents, loadServices} from './module';
import store from '../store/index';
import {defaultInjector, defaultRegistry} from '../common/index';

loadServices(defaultRegistry, store);
loadComponents(defaultInjector);
