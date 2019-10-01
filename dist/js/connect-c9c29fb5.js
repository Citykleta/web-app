const copyProps = (src, target) => {
    for (const p of Object.getOwnPropertyNames(src)) {
        target[p] = src[p];
    }
};
const connect = (store, stateToProp = state => state) => (klass) => class extends klass {
    constructor(...args) {
        super(...args);
        this.subscription = null;
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

export { connect as c };
//# sourceMappingURL=connect-c9c29fb5.js.map
