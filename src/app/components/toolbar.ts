import {ToolItem} from '../services/navigation';
import {Events, ToolSelectionState} from '../services/store';
import {ServiceRegistry} from '../services/service-registry';

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
<li class="tool-item">
    <button>Settings</button>
</li>
</ul>
`;

export const factory = (registry: ServiceRegistry): Element => {
    const {navigation, store} = registry;
    const domElement = document.createElement('DIV');
    domElement.classList.add('tools-bar');
    domElement.innerHTML = template;

    const [close, itenerary, search, settings] = Array.from(domElement.querySelectorAll('button'));

    close.addEventListener('click', ev => {
        navigation.unselectAll();
    });

    itenerary.addEventListener('click', ev => {
        navigation.selectTool(ToolItem.ITINERARY);
    });

    search.addEventListener('click', ev => {
        navigation.selectTool(ToolItem.SEARCH);
    });

    store.on(Events.TOOL_CHANGED, (state: ToolSelectionState) => {
        const {selectedTool} = state;
        itenerary.parentElement.classList.toggle('selected', selectedTool === ToolItem.ITINERARY);
        search.parentElement.classList.toggle('selected', selectedTool === ToolItem.SEARCH);
        close.parentElement.classList.toggle('hidden', selectedTool === null);
    });

    return domElement;
};
