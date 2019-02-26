import {Events, ToolSelectionState} from '../services/store';
import {ServiceRegistry} from '../services/service-registry';
import {ToolType} from '../tools/interfaces';
import {Component} from './interfaces';

const template = `<ul>
<li class="hidden tool-item">
    <button>Cancel</button>
</li>
<li class="tool-item">
    <button>Itinerary</button>
</li>
<li class="tool-item">
    <button>Search</button>
</li>
<!--<li class="tool-item">-->
    <!--<button>Settings</button>-->
<!--</li>-->
</ul>
`;

export const factory = (registry: ServiceRegistry): Component => {
    const {navigation, store} = registry;
    const domElement = document.createElement('DIV');
    domElement.classList.add('tools-bar');
    domElement.innerHTML = template;

    const [close, itenerary, search, settings] = Array.from(domElement.querySelectorAll('button'));

    close.addEventListener('click', ev => {
        navigation.unselectAll();
    });

    itenerary.addEventListener('click', ev => {
        navigation.selectTool(ToolType.ITINERARY);
    });

    search.addEventListener('click', ev => {
        navigation.selectTool(ToolType.SEARCH);
    });

    const toolChangedHandler = (state: ToolSelectionState) => {
        const {selectedTool} = state;
        itenerary.parentElement.classList.toggle('selected', selectedTool === ToolType.ITINERARY);
        search.parentElement.classList.toggle('selected', selectedTool === ToolType.SEARCH);
        close.parentElement.classList.toggle('hidden', selectedTool === null);
    };
    store.on(Events.TOOL_CHANGED, toolChangedHandler);

    return {
        clean() {
            store.off(Events.TOOL_CHANGED, toolChangedHandler);
        },
        dom() {
            return domElement;
        }

    };
};
