import store from '../store/index';
import {loadComponents, loadServices} from './module';
import {defaultInjector, defaultRegistry} from '../common';

loadServices(defaultRegistry, store);
loadComponents(defaultInjector);
