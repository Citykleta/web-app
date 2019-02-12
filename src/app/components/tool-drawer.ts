import {Events, ToolSelectionState} from '../services/store';
import {ToolItem} from '../services/navigation';
import {factory as itineraryControl} from './itinerary-control';
import {ServiceRegistry} from '../services/service-registry';

const template = `<div class="tool-container"></div>`;
const hiddenClassName = 'hidden';

export const factory = (registry: ServiceRegistry) => {
    const {store, itinerary} = registry;
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    domElement.classList.add(hiddenClassName);
    domElement.setAttribute('id', 'toolbox-container');
    const toolContent = domElement.firstChild;

    store.on(Events.TOOL_CHANGED, async (state: ToolSelectionState) => {
        const {selectedTool} = state;
        const isOpen = selectedTool !== null;
        domElement.classList.toggle(hiddenClassName, isOpen === false);

        if (toolContent.firstChild) {
            const range = document.createRange();
            range.selectNodeContents(toolContent);
            range.deleteContents();
        }

        if (isOpen) {
            // mount tool settings
            switch (selectedTool) {
                case ToolItem.ITINERARY:
                    toolContent.appendChild(itineraryControl(registry));
                    break;
                default:
                    throw new Error('unknown tool');
            }

        }
    });

    return domElement;
};
