const copyProps = (src, target) => {
    for (const p of Object.getOwnPropertyNames(src)) {
        target[p] = src[p];
    }
};

export const connect = (store, stateToProp = state => state) => (klass) => class extends klass {

    private subscription: Function = null;

    constructor(...args) {
        super(...args);
        copyProps(stateToProp(store.getState()), this);
    }

    connectedCallback() {
        super.connectedCallback();
        this.subscription = store.subscribe(() => {
            const props = stateToProp(store.getState());
            copyProps(props, this);
        });
    }

    disconnectedCallback() {
        this.subscription();
        super.disconnectedCallback();
    }
};
