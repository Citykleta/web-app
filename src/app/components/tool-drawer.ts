import {Events, Store, ToolSelectionState} from '../services/store';
import {NavigationService} from '../services/navigation';

export const template = `<div id="tools-content">
<button>close</button>
<p>Hello tool</p>
</div>`;

export const component = (store: Store, navigation: NavigationService) => {
    const domElement = document.createElement('DIV');
    domElement.classList.add('closed');
    domElement.setAttribute('id', 'tools-container');
    domElement.innerHTML = template;

    const closeButton = domElement.querySelector('button');

    closeButton.addEventListener('click', () => navigation.unselectAll());

    store.on(Events.TOOL_CHANGED, (state: ToolSelectionState) => {
        const {selectedTool} = state;
        const isOpen = selectedTool !== null;
        domElement.classList.toggle('closed', isOpen === false);
    });

    return domElement;
};
