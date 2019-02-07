const emitter = () => {
    const listenersLists = {};
    const instance = {
        on(event, ...listeners) {
            listenersLists[event] = (listenersLists[event] || []).concat(listeners);
            return instance;
        },
        dispatch(event, ...args) {
            const listeners = listenersLists[event] || [];
            for (const listener of listeners) {
                listener(...args);
            }
            return instance;
        },
        off(event, ...listeners) {
            if (event === undefined) {
                Object.keys(listenersLists).forEach(ev => instance.off(ev));
            }
            else {
                const list = listenersLists[event] || [];
                listenersLists[event] = listeners.length ? list.filter(listener => !listeners.includes(listener)) : [];
            }
            return instance;
        }
    };
    return instance;
};

var Events;
(function (Events) {
    Events["TOOL_CHANGED"] = "TOOL_CHANGED";
})(Events || (Events = {}));
const defaultState = () => {
    return {
        tool: {
            selectedTool: null
        }
    };
};
const provider = () => {
    const eventEmitter = emitter();
    let state = defaultState();
    return {
        selectTool(tool) {
            state.tool.selectedTool = tool;
            eventEmitter.dispatch(Events.TOOL_CHANGED, state.tool);
        },
        on(event, cb) {
            eventEmitter.on(event, cb);
        },
        getState() {
            return JSON.parse(JSON.stringify(state));
        }
    };
};
var defaultStore = provider();

var ToolItem;
(function (ToolItem) {
    ToolItem["ITINERARY"] = "ITINERARY";
    ToolItem["SEARCH"] = "SEARCH";
})(ToolItem || (ToolItem = {}));
const provider$1 = (store) => {
    let currentTool = null;
    store.on(Events.TOOL_CHANGED, (state) => {
        currentTool = state.selectedTool;
    });
    return {
        selectTool(tool) {
            if (tool !== currentTool) {
                store.selectTool(tool);
            }
        },
        unselectAll() {
            this.selectTool(null);
        }
    };
};
var navigation = provider$1(defaultStore);

const template = `<ul>
<li>
    <button>Itinerary</button>
</li>
<li>
    <button>Search</button>
</li>
</ul>
`;
const component = (store, navigation$$1) => {
    const domElement = document.createElement('DIV');
    domElement.classList.add('tools-bar');
    domElement.innerHTML = template;
    const [itenerary, search] = Array.from(domElement.querySelectorAll('button'));
    itenerary.addEventListener('click', ev => {
        navigation$$1.selectTool(ToolItem.ITINERARY);
    });
    search.addEventListener('click', ev => {
        navigation$$1.selectTool(ToolItem.SEARCH);
    });
    store.on(Events.TOOL_CHANGED, (state) => {
        const { selectedTool } = state;
        itenerary.parentElement.classList.toggle('selected', selectedTool === ToolItem.ITINERARY);
        search.parentElement.classList.toggle('selected', selectedTool === ToolItem.SEARCH);
    });
    return domElement;
};

const template$1 = `<div id="tools-content">
<button>close</button>
<p>Hello tool</p>
</div>`;
const component$1 = (store, navigation) => {
    const domElement = document.createElement('DIV');
    domElement.classList.add('closed');
    domElement.setAttribute('id', 'tools-container');
    domElement.innerHTML = template$1;
    const closeButton = domElement.querySelector('button');
    closeButton.addEventListener('click', () => navigation.unselectAll());
    store.on(Events.TOOL_CHANGED, (state) => {
        const { selectedTool } = state;
        const isOpen = selectedTool !== null;
        domElement.classList.toggle('closed', isOpen === false);
    });
    return domElement;
};

const drawer = component$1(defaultStore, navigation);
const toolbar = component(defaultStore, navigation);
drawer.appendChild(toolbar);
const body = document.querySelector('body');
const mapContainer = document.getElementById('map-container');
body.insertBefore(drawer, mapContainer);
//# sourceMappingURL=app-module.js.map
