import {loadComponents, loadServices} from './module';
import {defaultInjector, defaultRegistry} from '../common';
import store from '../store/index';

loadServices(defaultRegistry, store);
loadComponents(defaultInjector);