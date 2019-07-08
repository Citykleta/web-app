export interface ServiceRegistry {
    get(string): any

    set(string, service): any;
}

export const registry = (): ServiceRegistry => {
    const serviceMap = new Map<string, any>();

    return {
        get(label) {
            if (!serviceMap.has(label)) {
                throw new Error(`could not find service ${label}`);
            }

            return serviceMap.get(label);
        },
        set(label, service) {
            // todo should simply ignore
            if (serviceMap.has(label)) {
                throw new Error(`service ${label} has already been registered`);
            }

            serviceMap.set(label, service);
            return this.get(label);
        }
    };
};
