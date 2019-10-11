import {ServiceRegistry} from './service-registry';

export const withInjector = (registry: ServiceRegistry) => (klass) => class extends klass {
    constructor() {
        super(registry);
    }
};
