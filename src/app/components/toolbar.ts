import {NavigationService, ToolItem} from '../services/navigation';
import {Events, Store, ToolSelectionState} from '../services/store';

const template = `<ul>
<li>
    <button>Itinerary</button>
</li>
<li>
    <button>Search</button>
</li>
</ul>
`;

export const component = (store: Store, navigation: NavigationService): Element => {

    const domElement = document.createElement('DIV');
    domElement.classList.add('tools-bar');
    domElement.innerHTML = template;

    const [itenerary, search] = Array.from(domElement.querySelectorAll('button'));

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
    });

    return domElement;
};
